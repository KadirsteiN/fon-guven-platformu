"""
FastAPI REST API Sunucusu (Tüm Modüller: A, B, C, D, E, F, G, H + APScheduler & Admin Hub)
Dosya: backend/main.py
"""

from contextlib import asynccontextmanager
import csv
from datetime import datetime
import io
import json
import os
from pathlib import Path
import shutil
from typing import List, Dict, Any, Optional

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import (
    FastAPI,
    HTTPException,
    Query,
    Header,
    Depends,
    UploadFile,
    File,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from database import (
    init_db,
    get_connection,
    get_fund_stats,
    get_total_price_records,
    seed_settings,
    seed_legal_settings,
    get_settings,
    update_settings,
    get_splash_settings,
    update_splash_settings,
    get_legal_settings,
    update_legal_settings,
    insert_sync_log,
    seed_research_logs,
    get_research_logs,
)
from evidence_engine import (
    seed_evidence_cards,
    get_all_evidence_cards,
    evaluate_fund_transparency,
)
from bulletin_engine import (
    seed_real_bulletins,
    list_bulletins,
    compare_fund_reports,
    generate_structured_bulletin_summary,
    extract_text_from_pdf,
    discover_bulletin_candidates,
)
from analytics_engine import (
    analyze_fund_performance,
    compare_funds_normalized,
)
from basket_engine import (
    simulate_virtual_basket,
    save_basket,
    load_basket,
)
from personal_finance_engine import (
    seed_sample_personal_finance,
    get_financial_health_report,
    add_transaction,
    add_savings_goal,
)
from scenario_engine import run_scenario_simulation
from assistant_engine import ask_financial_assistant
from daily_updater import run_daily_tefas_sync, get_sync_status_summary
from tefas_fetcher import (
    fetch_tefas_history_chunked,
    import_tefas_csv,
    TefasFetchError,
    TEFAS_DISCOVERY_POOL,
    discover_and_add_random_five_funds,
)


# --- .env Yükleyici ve Klasör Hazırlığı ---
BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"
UPLOADS_DIR = BASE_DIR / "static" / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def _load_dotenv() -> None:
    if ENV_PATH.exists():
        for raw_line in ENV_PATH.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


_load_dotenv()
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin2026!")
ADMIN_SECRET_TOKEN = os.environ.get(
    "ADMIN_SECRET_TOKEN", "tubitak2209a-fon-guven-admin-token-2026"
)


def ensure_initialized() -> None:
    """Veritabanı tablolarını ve başlangıç tohum verilerini kontrol eder."""
    init_db()
    seed_settings()
    seed_legal_settings()
    seed_research_logs()
    with get_connection() as conn:
        price_cnt = conn.execute("SELECT COUNT(*) as c FROM fund_prices;").fetchone()["c"]
        if price_cnt > 0:
            conn.execute(
                "DELETE FROM funds WHERE fund_code NOT IN (SELECT DISTINCT fund_code FROM fund_prices);"
            )
            conn.commit()
        ev_cnt = conn.execute("SELECT COUNT(*) as c FROM evidence_cards;").fetchone()["c"]
        b_cnt = conn.execute("SELECT COUNT(*) as c FROM bulletins;").fetchone()["c"]
        tx_cnt = conn.execute("SELECT COUNT(*) as c FROM finance_transactions;").fetchone()["c"]

    if ev_cnt == 0:
        seed_evidence_cards()
    if b_cnt == 0:
        try:
            seed_real_bulletins()
        except Exception:
            pass
    if tx_cnt == 0:
        seed_sample_personal_finance(reset_existing=False)


ensure_initialized()


# --- APScheduler Arka Plan Zamanlayıcısı (GÖREV 1) ---
scheduler = BackgroundScheduler(timezone="Europe/Istanbul")


def _scheduled_2100_job() -> None:
    run_daily_tefas_sync(sync_type="CRON_21_00", force_check=False)


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    import threading

    # 1. Her iş günü (Pazartesi - Cuma) saat 21:00'de otomatik çalıştır
    if not scheduler.get_job("daily_tefas_2100_sync"):
        scheduler.add_job(
            _scheduled_2100_job,
            trigger=CronTrigger(day_of_week="mon-fri", hour=21, minute=0),
            id="daily_tefas_2100_sync",
            replace_existing=True,
        )
    if not scheduler.running:
        scheduler.start()

    # 2. Sistem ilk açıldığında (startup) veritabanındaki en son tarihe arka planda bak ve kontrol kaydı oluştur
    def _startup_bg():
        try:
            run_daily_tefas_sync(sync_type="STARTUP_AUTO_CHECK", force_check=False)
        except Exception:
            pass

    threading.Thread(target=_startup_bg, daemon=True).start()

    yield

    if scheduler.running:
        scheduler.shutdown(wait=False)



app = FastAPI(
    title="Kişisel Finans, Yatırım Fonları, Finansal Şeffaflık ve Fonlara Güven Platformu API",
    description="TÜBİTAK 2209-A Araştırma Projesi — Doğrulanabilir Finansal Veri, APScheduler ve Yönetici Merkezi",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=".*",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# Statik Yüklemeler Klasörü (/uploads)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


# --- Yönetici Kimlik Doğrulama Bağımlılığı (GÖREV 2) ---
def verify_admin_token(authorization: Optional[str] = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Yetkisiz erişim: Geçerli bir 'Authorization: Bearer <token>' başlığı gereklidir.",
        )
    token = authorization.replace("Bearer ", "", 1).strip()
    if token != ADMIN_SECRET_TOKEN:
        raise HTTPException(
            status_code=401,
            detail="Yetkisiz erişim: Yönetici oturum anahtarı (token) geçersiz veya süresi dolmuş.",
        )
    return token


# --- Pydantic İstek Şemaları ---

class AdminLoginRequest(BaseModel):
    password: str = Field(..., example="admin2026!")


class BrandingSettingsUpdateRequest(BaseModel):
    site_title: str = Field(..., example="Fon Güven & Şeffaflık")
    site_subtitle: str = Field(..., example="TÜBİTAK 2209-A Araştırma Platformu")
    site_logo_url: Optional[str] = Field(default=None)


class SplashSettingsUpdateRequest(BaseModel):
    splash_enabled: bool = Field(default=True, example=True)
    splash_duration_ms: int = Field(default=2200, ge=500, le=10000, example=2200)
    splash_quotes: List[str] = Field(
        default_factory=list,
        example=[
            "Finansta en değerli sermaye doğru ve doğrulanabilir bilgidir.",
            "Yatırımlarınızı sloganlara değil, resmi kanıtlara dayandırın.",
        ],
    )


class LegalTextsUpdateRequest(BaseModel):
    legal_disclaimer_spk: str
    legal_terms_of_service: str
    legal_privacy_kvkk: str
    legal_tubitak_consent: str
    legal_methodology: str


class BulletinDraftRequest(BaseModel):
    fund_code: Optional[str] = Field(default=None, example="AFT")
    title: str = Field(..., example="AFT — 2026 Kasım Dönemi Portföy Dağılım ve Performans Raporu")
    category: str = Field(default="FON_SEKTOR_BULTENI")
    doc_type: str = Field(default="AYLIK_FON_BULTENI")
    source_institution: str = Field(..., example="Ak Portföy Yönetimi A.Ş. (KAP)")
    publish_date: str = Field(..., example="2026-10-17")
    period_covered: str = Field(..., example="2026-10")
    original_url: str = Field(..., example="https://www.kap.org.tr/tr/YatirimFonlari")
    content_origin_badge: str = Field(default="RESMI_BELGE_OZETI")
    raw_text: str = Field(..., description="Belge metni veya PDF'ten ayrıştırılan metin")


class BulletinPublishRequest(BaseModel):
    fund_code: Optional[str] = Field(default=None)
    title: str
    category: str = Field(default="FON_SEKTOR_BULTENI")
    doc_type: str = Field(default="AYLIK_FON_BULTENI")
    source_institution: str
    publish_date: str
    period_covered: str
    original_url: str
    content_origin_badge: str = Field(default="RESMI_BELGE_OZETI")
    raw_text: str
    ai_summary: Dict[str, Any]


class AnalyticsPerformanceRequest(BaseModel):
    fund_code: str = Field(..., example="AFT")
    start_date: str = Field(..., example="2026-01-03")
    end_date: str = Field(..., example="2026-10-16")


class AnalyticsCompareRequest(BaseModel):
    fund_codes: List[str] = Field(..., example=["AFT", "MAC", "TTA", "IPB", "TI1"])
    start_date: str = Field(..., example="2026-01-03")
    end_date: str = Field(..., example="2026-10-16")


class BasketAllocationItem(BaseModel):
    fund_code: str = Field(..., example="AFT")
    amount_tl: float = Field(..., gt=0, example=10000.0)


class BasketSimulateRequest(BaseModel):
    allocations: List[BasketAllocationItem]
    start_date: str = Field(..., example="2026-01-03")
    end_date: str = Field(..., example="2026-10-16")


class BasketSaveRequest(BaseModel):
    basket_name: str = Field(..., example="Dengeli 40.000 TL Sepetim")
    allocations: List[BasketAllocationItem]
    start_date: str = Field(..., example="2026-01-03")
    end_date: str = Field(..., example="2026-10-16")


class FinanceTransactionCreateRequest(BaseModel):
    tx_type: str = Field(..., example="EXPENSE")
    category: str = Field(..., example="Market/Gıda")
    amount: float = Field(..., gt=0, example=1500.0)
    tx_date: str = Field(..., example="2026-10-15")
    is_fixed: int = Field(default=0, example=1)
    description: str = Field(default="", example="Haftalık Market Alışverişi")


class SavingsGoalCreateRequest(BaseModel):
    goal_name: str = Field(..., example="Yeni Bilgisayar / Eğitim Fonu")
    target_amount: float = Field(..., gt=0, example=75000.0)
    current_saved: float = Field(default=15000.0, ge=0)
    target_date: str = Field(..., example="2027-06-30")
    priority: str = Field(default="YÜKSEK")


class ScenarioSimulateRequest(BaseModel):
    scenario_type: str = Field(default="ALL", example="ALL")
    params: Optional[Dict[str, Any]] = Field(default_factory=dict)


class AssistantAskRequest(BaseModel):
    user_query: str = Field(..., example="AFT ile TI1 fonlarının performans farkı ve riskleri nedir?")
    context_fund_codes: Optional[List[str]] = Field(default=None)
    start_date: str = Field(default="2026-01-03")
    end_date: str = Field(default="2026-10-16")
    month_prefix: str = Field(default="2026-10")


class FundFetchRequest(BaseModel):
    fund_code: str = Field(..., example="YAY")
    fund_type: str = Field(default="Yatırım Fonu", example="Yabancı Teknoloji Fonu")
    total_days: int = Field(default=365, ge=30, le=365)


class ResearchLogCreateRequest(BaseModel):
    participant_code: str = Field(..., example="K-2209-09")
    module_code: str = Field(..., example="MODUL_A_KANIT")
    action_type: str = Field(..., example="KANIT_KARTI_INCELEME")
    fund_or_topic: str = Field(..., example="SPKn Md. 53 Varlık Ayrılığı")
    duration_sec: int = Field(default=120, ge=0)
    trust_score_pre: int = Field(default=50, ge=0, le=100)
    trust_score_post: int = Field(default=90, ge=0, le=100)
    notes: str = Field(default="")


# --- GENEL (PUBLIC) SİSTEM & SENKRONİZASYON UÇ NOKTALARI ---

@app.get("/")
@app.get("/api/health")
def api_health() -> Dict[str, Any]:
    """Veritabanı ve gerçek TEFAS veri güncelliği durumunu döndürür."""
    with get_connection() as conn:
        funds_cnt = conn.execute("SELECT COUNT(*) as c FROM funds;").fetchone()["c"]
        min_max = conn.execute(
            "SELECT MIN(date) as min_d, MAX(date) as max_d FROM fund_prices;"
        ).fetchone()
        ev_cnt = conn.execute("SELECT COUNT(*) as c FROM evidence_cards;").fetchone()["c"]
        bul_cnt = conn.execute("SELECT COUNT(*) as c FROM bulletins;").fetchone()["c"]
        bask_cnt = conn.execute("SELECT COUNT(*) as c FROM virtual_baskets;").fetchone()["c"]

    return {
        "status": "OK",
        "project": "Kişisel Finans, Yatırım Fonları, Finansal Şeffaflık ve Fonlara Güven Platformu (TÜBİTAK 2209-A)",
        "database_summary": {
            "tracked_funds_count": int(funds_cnt),
            "total_real_tefas_price_records": get_total_price_records(),
            "oldest_price_date": min_max["min_d"] if min_max else None,
            "latest_price_date": min_max["max_d"] if min_max else None,
            "evidence_cards_count": int(ev_cnt),
            "bulletins_count": int(bul_cnt),
            "saved_virtual_baskets_count": int(bask_cnt),
        },
    }


@app.get("/api/public/sync-status")
def api_public_sync_status() -> Dict[str, Any]:
    """GÖREV 1: En son başarılı güncelleme tarihini, zamanlayıcıyı ve veritabanı durumunu döndürür."""
    job = scheduler.get_job("daily_tefas_2100_sync") if scheduler.running else None
    next_run = (
        job.next_run_time.strftime("%Y-%m-%d %H:%M:%S %Z")
        if job and job.next_run_time
        else None
    )
    return get_sync_status_summary(
        scheduler_running=bool(scheduler.running),
        next_run_time=next_run,
    )


@app.get("/api/public/settings")
def api_public_get_settings() -> Dict[str, str]:
    """GÖREV 3: Herkesin erişebileceği başlık, alt başlık ve logo URL'sini döndürür."""
    return get_settings()


@app.get("/api/public/splash-settings")
def api_public_get_splash_settings() -> Dict[str, Any]:
    """GÖREV 1: Herkese açık; splash_enabled, splash_duration_ms ve splash_quotes listesini döndürür."""
    return get_splash_settings()


@app.get("/api/public/legal-texts")
def api_public_get_legal_texts() -> Dict[str, str]:
    """GÖREV 1: Tüm ziyaretçilerin 5 yasal bildirim ve sözleşme metnini okuyabileceği genel uç nokta."""
    return get_legal_settings()


# --- YÖNETİCİ (ADMIN HUB) UÇ NOKTALARI (GÖREV 1, 2, 3, 4, 5, 6) ---

@app.post("/api/admin/login")
def api_admin_login(req: AdminLoginRequest) -> Dict[str, Any]:
    """GÖREV 2: Yönetici şifresini doğrular ve Bearer token döndürür."""
    if req.password != ADMIN_PASSWORD:
        raise HTTPException(
            status_code=401,
            detail="Hatalı yönetici şifresi! Lütfen şifrenizi kontrol edin.",
        )
    return {
        "status": "AUTHENTICATED",
        "token": ADMIN_SECRET_TOKEN,
        "message": "Yönetici girişi başarılı.",
    }


@app.get("/api/admin/verify")
def api_admin_verify(_token: str = Depends(verify_admin_token)) -> Dict[str, Any]:
    """Token geçerliliğini kontrol eder."""
    return {"status": "VALID"}


@app.post("/api/admin/settings")
def api_admin_update_settings(
    req: BrandingSettingsUpdateRequest,
    _token: str = Depends(verify_admin_token),
) -> Dict[str, Any]:
    """GÖREV 3: Site başlığı, alt başlığı ve logo URL'sini günceller."""
    updates: Dict[str, str] = {
        "site_title": req.site_title.strip(),
        "site_subtitle": req.site_subtitle.strip(),
    }
    if req.site_logo_url is not None:
        updates["site_logo_url"] = req.site_logo_url.strip()
    updated = update_settings(updates)
    return {
        "status": "UPDATED",
        "settings": updated,
    }


@app.post("/api/admin/splash-settings")
def api_admin_update_splash_settings(
    req: SplashSettingsUpdateRequest,
    _token: str = Depends(verify_admin_token),
) -> Dict[str, Any]:
    """GÖREV 1 & 3: Karşılama ekranının açık/kapalı durumunu, süresini ve motive edici sözler listesini günceller."""
    updated = update_splash_settings(
        splash_enabled=req.splash_enabled,
        splash_duration_ms=req.splash_duration_ms,
        splash_quotes=req.splash_quotes,
    )
    return {
        "status": "UPDATED",
        "splash_settings": updated,
    }


@app.post("/api/admin/legal-texts")
def api_admin_update_legal_texts(
    req: LegalTextsUpdateRequest,
    _token: str = Depends(verify_admin_token),
) -> Dict[str, Any]:
    """GÖREV 1 & 4: Yöneticinin 5 yasal metni (SPK Uyarısı, Kullanım Koşulları, KVKK, TÜBİTAK Onamı, Metodoloji) düzenleyebileceği uç nokta."""
    updated = update_legal_settings(
        {
            "legal_disclaimer_spk": req.legal_disclaimer_spk,
            "legal_terms_of_service": req.legal_terms_of_service,
            "legal_privacy_kvkk": req.legal_privacy_kvkk,
            "legal_tubitak_consent": req.legal_tubitak_consent,
            "legal_methodology": req.legal_methodology,
        }
    )
    return {
        "status": "UPDATED",
        "legal_texts": updated,
    }


@app.post("/api/admin/upload-logo")
async def api_admin_upload_logo(
    file: UploadFile = File(...),
    _token: str = Depends(verify_admin_token),
) -> Dict[str, Any]:
    """GÖREV 3: Bilgisayardan seçilen logoyu (.png, .jpg, .svg, .webp) kaydeder ve site_logo_url ayarını günceller."""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in (".png", ".jpg", ".jpeg", ".svg", ".webp"):
        raise HTTPException(
            status_code=400,
            detail="Desteklenmeyen dosya türü. Lütfen .png, .jpg, .svg veya .webp yükleyin.",
        )
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = f"site_logo_{ts}{ext}"
    dest_path = UPLOADS_DIR / safe_name

    with dest_path.open("wb") as out_f:
        shutil.copyfileobj(file.file, out_f)

    logo_url = f"/uploads/{safe_name}"
    updated = update_settings({"site_logo_url": logo_url})
    return {
        "status": "UPLOADED",
        "site_logo_url": logo_url,
        "settings": updated,
    }


@app.post("/api/admin/funds/sync-now")
def api_admin_sync_funds_now(
    force_check: bool = Query(default=True),
    _token: str = Depends(verify_admin_token),
) -> Dict[str, Any]:
    """GÖREV 1 & 5: Yöneticinin tek tıkla anında TEFAS senkronizasyonunu tetiklediği uç nokta."""
    return run_daily_tefas_sync(sync_type="ADMIN_MANUAL_SYNC", force_check=force_check)


@app.post("/api/admin/funds/add")
def api_admin_add_fund(
    req: FundFetchRequest,
    _token: str = Depends(verify_admin_token),
) -> Dict[str, Any]:
    """GÖREV 5: Yeni fon kodunu ekleyip son 1 yıllık gerçek TEFAS verisini çeker."""
    try:
        res = fetch_tefas_history_chunked(
            fund_code=req.fund_code,
            total_days=req.total_days,
            fund_type_label=req.fund_type,
        )
        insert_sync_log(
            sync_type="ADMIN_FUND_ADD",
            status="UPDATED" if res.get("total_db_days", 0) > 0 else "EMPTY",
            details=json.dumps(
                {
                    "message": (
                        f"[{res.get('fund_code')}] {res.get('fund_title') or ''} fonu havuza eklendi "
                        f"(Toplam {res.get('total_db_days', 0)} işlem günü, yeni eklenen: {res.get('newly_saved_records', 0)})."
                    ),
                    **res,
                },
                ensure_ascii=False,
            ),
        )
        try:
            seed_real_bulletins()
        except Exception:
            pass
        return res
    except (TefasFetchError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/admin/funds/upload-csv")
async def api_admin_upload_tefas_csv(
    file: UploadFile = File(...),
    default_fund_type: str = Query(default="Yatırım Fonu"),
    _token: str = Depends(verify_admin_token),
) -> Dict[str, Any]:
    """GÖREV 5: TEFAS'tan indirilen resmi CSV/Excel dosyasını veritabanına aktarır."""
    ext = Path(file.filename or "tefas.csv").suffix.lower() or ".csv"
    if ext not in (".csv", ".xls", ".xlsx", ".txt"):
        raise HTTPException(
            status_code=400,
            detail="Lütfen geçerli bir CSV veya Excel (.csv, .xls, .xlsx) dosyası yükleyin.",
        )
    temp_path = UPLOADS_DIR / f"temp_import_{datetime.now().strftime('%Y%m%d_%H%M%S')}{ext}"
    try:
        with temp_path.open("wb") as out_f:
            shutil.copyfileobj(file.file, out_f)
        res = import_tefas_csv(temp_path, default_fund_type=default_fund_type)
        insert_sync_log(
            sync_type="ADMIN_CSV_IMPORT",
            status="UPDATED",
            details=json.dumps(
                {
                    "message": (
                        f"Resmi TEFAS CSV içe aktarıldı: {len(res['funds_imported'])} fon "
                        f"({', '.join(res['funds_imported'])}), {res['saved_count']} kayıt."
                    ),
                    **res,
                },
                ensure_ascii=False,
            ),
        )
        return res
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"CSV içe aktarma hatası: {exc}") from exc
    finally:
        if temp_path.exists():
            try:
                temp_path.unlink()
            except Exception:
                pass


@app.post("/api/admin/funds/add-random-five")
def api_admin_add_random_five_funds(
    _token: str = Depends(verify_admin_token),
) -> Dict[str, Any]:
    """
    GÖREV 4: Keşif havuzunda (TEFAS_DISCOVERY_POOL) yer alan ancak henüz SQLite
    veritabanımıza eklenmemiş gerçek TEFAS fonları arasından rastgele 5 tanesini seçer
    ve son 1 yıllık (365 gün) gerçek tarihsel verilerini TEFAS API'den çekerek kaydeder.
    """
    try:
        res = discover_and_add_random_five_funds(total_days=365, count=5)
        codes_summary = ", ".join(
            f"{item['fund_code']} ({item['trading_days_count']} gün)"
            for item in res.get("added_funds", [])
        )
        insert_sync_log(
            sync_type="ADMIN_RANDOM_5_DISCOVERY",
            status="UPDATED",
            details=json.dumps(
                {
                    "message": (
                        f"Rastgele 5 yeni TEFAS fonu keşfedildi ve 1 yıllık verisi çekildi: "
                        f"{codes_summary}. Toplam {res.get('total_records_saved', 0)} kayıt eklendi."
                    ),
                    **res,
                },
                ensure_ascii=False,
            ),
        )
        try:
            seed_real_bulletins()
        except Exception:
            pass
        return res
    except (TefasFetchError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/admin/bulletins/discover")
def api_admin_discover_bulletins(
    _token: str = Depends(verify_admin_token),
) -> Dict[str, Any]:
    """
    GÖREV 5: Veritabanındaki mevcut fonların en güncel TEFAS performans/portföy/yatırımcı
    değişimlerini, KAP bildirim bağlantılarını ve SPK duyurularını tarayarak
    'Yayına Hazır Otomatik Bulunan Bülten Adayları' listesini döndürür.
    """
    candidates = discover_bulletin_candidates()
    return {
        "count": len(candidates),
        "candidates": candidates,
    }


@app.post("/api/admin/bulletins/extract-pdf")
async def api_admin_extract_pdf(
    file: UploadFile = File(...),
    _token: str = Depends(verify_admin_token),
) -> Dict[str, Any]:
    """GÖREV 4: Yüklenen PDF belgesini sayfa numaralı metne dönüştürür."""
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Lütfen .pdf uzantılı bir belge yükleyin.")
    temp_pdf = UPLOADS_DIR / f"bulletin_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    try:
        with temp_pdf.open("wb") as out_f:
            shutil.copyfileobj(file.file, out_f)
        extracted = extract_text_from_pdf(temp_pdf)
        return {
            "status": "EXTRACTED",
            "filename": file.filename,
            "extracted_text": extracted,
            "char_count": len(extracted),
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"PDF okuma hatası: {exc}") from exc


@app.post("/api/admin/bulletins/draft")
def api_admin_generate_bulletin_draft(
    req: BulletinDraftRequest,
    _token: str = Depends(verify_admin_token),
) -> Dict[str, Any]:
    """GÖREV 4: Girilen metni 7 zorunlu başlığa ayırarak düzenlenebilir taslak özet üretir."""
    if not req.raw_text.strip():
        raise HTTPException(status_code=400, detail="Özetlenecek belge metni boş olamaz.")
    draft = generate_structured_bulletin_summary(
        raw_text=req.raw_text,
        title=req.title,
        source_institution=req.source_institution,
        publish_date=req.publish_date,
        period_covered=req.period_covered,
        original_url=req.original_url,
        content_origin_badge=req.content_origin_badge,
    )
    return {
        "status": "DRAFT_READY",
        "draft_summary": draft,
    }


@app.post("/api/admin/bulletins/publish")
def api_admin_publish_bulletin(
    req: BulletinPublishRequest,
    _token: str = Depends(verify_admin_token),
) -> Dict[str, Any]:
    """GÖREV 4: Yöneticinin inceleyip düzenlediği 7 başlıklı bülteni bulletins tablosuna kaydeder."""
    code = req.fund_code.strip().upper() if req.fund_code and req.fund_code.strip() else None
    with get_connection() as conn:
        cur = conn.execute(
            """
            INSERT INTO bulletins (
                fund_code, title, category, doc_type, source_institution,
                publish_date, period_covered, original_url, raw_text,
                ai_summary_json, content_origin_badge
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                code,
                req.title.strip(),
                req.category,
                req.doc_type,
                req.source_institution.strip(),
                req.publish_date.strip(),
                req.period_covered.strip(),
                req.original_url.strip(),
                req.raw_text,
                json.dumps(req.ai_summary, ensure_ascii=False),
                req.content_origin_badge,
            ),
        )
        conn.commit()
        new_id = int(cur.lastrowid)
    return {
        "status": "PUBLISHED",
        "bulletin_id": new_id,
        "message": f"Bülten başarıyla yayına alındı (ID #{new_id}).",
    }


@app.delete("/api/admin/bulletins/{bulletin_id}")
def api_admin_delete_bulletin(
    bulletin_id: int,
    _token: str = Depends(verify_admin_token),
) -> Dict[str, Any]:
    """Yöneticinin bülten silmesine olanak tanır."""
    with get_connection() as conn:
        conn.execute("DELETE FROM bulletins WHERE id = ?;", (bulletin_id,))
        conn.commit()
    return {"status": "DELETED", "bulletin_id": bulletin_id}


@app.get("/api/admin/research/metrics")
def api_admin_research_metrics(
    _token: str = Depends(verify_admin_token),
) -> Dict[str, Any]:
    """GÖREV 6: TÜBİTAK 2209-A katılımcı etkileşim ve güven ön-test/son-test verilerini döndürür."""
    logs = get_research_logs()
    total_participants = len({r["participant_code"] for r in logs})
    avg_pre = (
        round(sum(r["trust_score_pre"] or 0 for r in logs) / len(logs), 1)
        if logs
        else 0.0
    )
    avg_post = (
        round(sum(r["trust_score_post"] or 0 for r in logs) / len(logs), 1)
        if logs
        else 0.0
    )
    avg_duration = (
        round(sum(r["duration_sec"] or 0 for r in logs) / len(logs), 1)
        if logs
        else 0.0
    )

    with get_connection() as conn:
        baskets_cnt = conn.execute("SELECT COUNT(*) as c FROM virtual_baskets;").fetchone()["c"]
        funds_cnt = conn.execute("SELECT COUNT(*) as c FROM funds;").fetchone()["c"]
        ev_cnt = conn.execute("SELECT COUNT(*) as c FROM evidence_cards;").fetchone()["c"]

    return {
        "summary": {
            "total_interaction_records": len(logs),
            "unique_participants_count": total_participants,
            "avg_trust_score_pre_100": avg_pre,
            "avg_trust_score_post_100": avg_post,
            "avg_trust_gain_points": round(avg_post - avg_pre, 1),
            "avg_session_duration_sec": avg_duration,
            "saved_virtual_baskets_count": int(baskets_cnt),
            "tracked_tefas_funds_count": int(funds_cnt),
            "evidence_cards_count": int(ev_cnt),
        },
        "logs": logs,
    }


@app.post("/api/admin/research/log")
def api_admin_add_research_log(
    req: ResearchLogCreateRequest,
    _token: str = Depends(verify_admin_token),
) -> Dict[str, Any]:
    """Yeni bir anonim katılımcı etkileşim / test kaydı ekler."""
    with get_connection() as conn:
        cur = conn.execute(
            """
            INSERT INTO research_logs (
                participant_code, module_code, action_type, fund_or_topic,
                duration_sec, trust_score_pre, trust_score_post, data_badge, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ANONIM_ARASTIRMA_ETKILESIM_VERISI', ?);
            """,
            (
                req.participant_code.strip(),
                req.module_code.strip(),
                req.action_type.strip(),
                req.fund_or_topic.strip(),
                req.duration_sec,
                req.trust_score_pre,
                req.trust_score_post,
                req.notes.strip(),
            ),
        )
        conn.commit()
        new_id = int(cur.lastrowid)
    return {"status": "CREATED", "id": new_id}


@app.get("/api/admin/research/export-csv")
def api_admin_export_research_csv(
    token: Optional[str] = Query(default=None),
    authorization: Optional[str] = Header(default=None),
) -> StreamingResponse:
    """GÖREV 6: TÜBİTAK 2209-A araştırma verilerini Excel uyumlu UTF-8-BOM CSV olarak indirir."""
    effective_token = token
    if not effective_token and authorization and authorization.startswith("Bearer "):
        effective_token = authorization.replace("Bearer ", "", 1).strip()
    if effective_token != ADMIN_SECRET_TOKEN:
        raise HTTPException(status_code=401, detail="Yetkisiz erişim.")

    logs = get_research_logs()
    output = io.StringIO()
    output.write("\ufeff")  # Excel TR karakter uyumu için UTF-8 BOM
    writer = csv.writer(output, delimiter=";")
    writer.writerow(
        [
            "ID",
            "Katilimci_Kodu",
            "Modul",
            "Etkilesim_Turu",
            "Incelenen_Fon_Veya_Konu",
            "Sure_Saniye",
            "On_Test_Guven_Puani",
            "Son_Test_Guven_Puani",
            "Guven_Artisi_Fark",
            "Veri_Etiketi",
            "Gozlem_Notu",
            "Tarih_Saat",
        ]
    )
    for r in logs:
        pre = r.get("trust_score_pre") or 0
        post = r.get("trust_score_post") or 0
        writer.writerow(
            [
                r.get("id"),
                r.get("participant_code"),
                r.get("module_code"),
                r.get("action_type"),
                r.get("fund_or_topic"),
                r.get("duration_sec"),
                pre,
                post,
                post - pre,
                r.get("data_badge"),
                r.get("notes"),
                r.get("created_at"),
            ]
        )

    output.seek(0)
    headers = {
        "Content-Disposition": 'attachment; filename="tubitak_2209a_arastirma_verileri.csv"'
    }
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers=headers,
    )


@app.get("/api/admin/research/export-xlsx")
def api_admin_export_research_xlsx(
    token: Optional[str] = Query(default=None),
    authorization: Optional[str] = Header(default=None),
) -> StreamingResponse:
    """GÖREV 6: TÜBİTAK 2209-A araştırma verilerini ve metodoloji tablosunu çok sayfalı Excel (.xlsx) olarak indirir."""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter

    effective_token = token
    if not effective_token and authorization and authorization.startswith("Bearer "):
        effective_token = authorization.replace("Bearer ", "", 1).strip()
    if effective_token != ADMIN_SECRET_TOKEN:
        raise HTTPException(status_code=401, detail="Yetkisiz erişim.")

    logs = get_research_logs()
    wb = Workbook()
    header_fill = PatternFill(start_color="065F46", end_color="065F46", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=11)

    ws1 = wb.active
    ws1.title = "Katılımcı Test Verileri"
    headers_1 = [
        "ID",
        "Katılımcı Kodu (Anonim ID)",
        "İncelenen Modül",
        "Etkileşim Türü",
        "İncelenen Fon veya Konu",
        "Süre (Saniye)",
        "Ön-Test Güven Puanı (0-100)",
        "Son-Test Güven Puanı (0-100)",
        "Güven Artışı Farkı (Puan)",
        "Veri Etiketi",
        "Gözlem Notu",
        "Tarih / Saat",
    ]
    ws1.append(headers_1)
    for col_idx in range(1, len(headers_1) + 1):
        cell = ws1.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    for r in logs:
        pre = int(r.get("trust_score_pre") or 0)
        post = int(r.get("trust_score_post") or 0)
        ws1.append(
            [
                r.get("id"),
                r.get("participant_code"),
                r.get("module_code"),
                r.get("action_type"),
                r.get("fund_or_topic"),
                r.get("duration_sec"),
                pre,
                post,
                post - pre,
                r.get("data_badge"),
                r.get("notes"),
                r.get("created_at"),
            ]
        )

    ws2 = wb.create_sheet(title="TÜBİTAK 2209-A Metodoloji")
    ws2.append(["Veri Alanı / Değişken", "Bilimsel Araştırmada Toplanma Amacı ve İstatistiksel Karşılığı"])
    for col_idx in (1, 2):
        cell = ws2.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font

    ws2.append([
        "Katılımcı Kodu (Anonim ID)",
        "6698 sayılı KVKK uyumu kapsamında kişisel veri toplamadan aynı katılımcının Ön-Test ve Son-Test puanlarını eşleştirmek (Bağımlı Örneklem t-Testi / Wilcoxon İşaretli Sıralar Testi) için kullanılır.",
    ])
    ws2.append([
        "Ön-Test / Son-Test Güven Puanları (0-100)",
        "Katılımcının platformu kullanmadan önceki ve sonraki 'Fon Hukuki Güvencesi (SPKn Md. 53 Varlık Ayrılığı & Takasbank Saklama)' ile '100 Bazlı Fiyat / Risk Okuryazarlığı' düzeyini ölçer.",
    ])
    ws2.append([
        "Modül Etkileşim Verileri ve Süre",
        "Katılımcının kaç kanıt kartı okuduğu, bülten özetlerindeki Kesin Veri vs. Yorum ayrımını inceleyip incelemediği ve sanal sepet kurup kurmadığının araştırma hipotezini (H1) doğrulamakta nasıl etkili olduğunu gösterir.",
    ])

    for sheet in (ws1, ws2):
        for col in sheet.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                val_str = str(cell.value or "")
                if len(val_str) > max_len:
                    max_len = len(val_str)
            sheet.column_dimensions[col_letter].width = min(max(max_len + 4, 15), 65)

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    return StreamingResponse(
        iter([stream.getvalue()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": 'attachment; filename="tubitak_2209a_arastirma_verileri.xlsx"'
        },
    )


# --- MEVCUT KULLANICI MODÜL UÇ NOKTALARI (A, B, C, D, E, F, G, H) ---

# Modül A & G: Kanıt Kartları ve Fon Şeffaflığı
@app.get("/api/evidence-cards")
def api_get_evidence_cards() -> Dict[str, Any]:
    cards = get_all_evidence_cards()
    return {
        "count": len(cards),
        "evidence_cards": cards,
    }


@app.get("/api/transparency/{fund_code}")
def api_get_fund_transparency(fund_code: str) -> Dict[str, Any]:
    try:
        return evaluate_fund_transparency(fund_code=fund_code)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# Modül B: Fon Bültenleri, Tekil Bülten Özeti ve Dönem Karşılaştırma
@app.get("/api/bulletins")
def api_list_bulletins(
    category: Optional[str] = Query(default=None),
    fund_code: Optional[str] = Query(default=None),
) -> Dict[str, Any]:
    items = list_bulletins(category=category, fund_code=fund_code)
    return {
        "count": len(items),
        "bulletins": items,
    }


@app.get("/api/bulletins/compare/{fund_code}")
def api_compare_bulletin_periods(
    fund_code: str,
    period_old: str = Query(default="2026-07"),
    period_new: str = Query(default="2026-10"),
) -> Dict[str, Any]:
    try:
        return compare_fund_reports(
            fund_code=fund_code,
            period_old=period_old,
            period_new=period_new,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/bulletins/{bulletin_id}")
def api_get_bulletin_detail(bulletin_id: int) -> Dict[str, Any]:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM bulletins WHERE id = ?;",
            (bulletin_id,),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"ID={bulletin_id} olan bülten bulunamadı.")
    item = dict(row)
    item["ai_summary"] = json.loads(item["ai_summary_json"])
    return item


# Modül C: Fon Listesi, Canlı TEFAS Fon Ekleme, Performans Analizi ve 100 Bazlı Normalizasyon
@app.get("/api/funds")
def api_list_funds() -> Dict[str, Any]:
    with get_connection() as conn:
        rows = conn.execute("SELECT fund_code FROM funds ORDER BY fund_code ASC;").fetchall()
    funds_list = [get_fund_stats(r["fund_code"]) for r in rows]
    return {
        "count": len(funds_list),
        "funds": funds_list,
    }


@app.post("/api/funds/fetch")
def api_fetch_new_fund(req: FundFetchRequest) -> Dict[str, Any]:
    try:
        res = fetch_tefas_history_chunked(
            fund_code=req.fund_code,
            total_days=req.total_days,
            fund_type_label=req.fund_type,
        )
        seed_real_bulletins()
        return res
    except (TefasFetchError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/analytics/performance")
def api_analyze_performance(req: AnalyticsPerformanceRequest) -> Dict[str, Any]:
    try:
        return analyze_fund_performance(
            fund_code=req.fund_code,
            requested_start_date=req.start_date,
            requested_end_date=req.end_date,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/analytics/compare")
def api_compare_funds(req: AnalyticsCompareRequest) -> Dict[str, Any]:
    try:
        return compare_funds_normalized(
            fund_codes=req.fund_codes,
            requested_start_date=req.start_date,
            requested_end_date=req.end_date,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/analytics/export-xlsx")
def api_export_analytics_xlsx(req: AnalyticsCompareRequest) -> StreamingResponse:
    """
    GÖREV 3: Fon Performans Analizi sonuçlarını ve 100 bazlı günlük zaman serisini
    düzenli, çok sayfalı ve otomatik sütun genişlikli gerçek Excel (.xlsx) dosyası
    olarak indirir.
    """
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter

    try:
        comp = compare_funds_normalized(
            fund_codes=req.fund_codes,
            requested_start_date=req.start_date,
            requested_end_date=req.end_date,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    codes = [c.strip().upper() for c in req.fund_codes]
    actual_start = comp["actual_start_date"]
    actual_end = comp["actual_end_date"]

    # Seçilen fonların günlük birim pay fiyatlarını SQLite'tan çek
    raw_prices_by_date: Dict[str, Dict[str, float]] = {}
    with get_connection() as conn:
        placeholders = ",".join("?" for _ in codes)
        rows = conn.execute(
            f"""
            SELECT fund_code, date, price
            FROM fund_prices
            WHERE fund_code IN ({placeholders})
              AND date >= ? AND date <= ?
            ORDER BY date ASC;
            """,
            (*codes, actual_start, actual_end),
        ).fetchall()
        for r in rows:
            d_str = r["date"]
            raw_prices_by_date.setdefault(d_str, {})[r["fund_code"]] = float(r["price"])

    wb = Workbook()
    header_fill = PatternFill(start_color="1E40AF", end_color="1E40AF", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=11)

    # --- SAYFA 1: Özet Performans Tablosu ---
    ws1 = wb.active
    ws1.title = "Özet Performans Tablosu"
    headers_s1 = [
        "Fon Kodu",
        "Fon Ünvanı",
        "Kategori",
        "İstenen Tarih Aralığı",
        "Gerçekleşen İşlem Günleri",
        "Ortak İşlem Günü Sayısı",
        "Başlangıç Fiyatı (TL)",
        "Bitiş Fiyatı (TL)",
        "Dönemsel Getiri (%)",
        "100 Bazlı Bitiş Değeri (TL)",
        "Maksimum Düşüş - Max Drawdown (%)",
        "Yıllık Volatilite (%)",
    ]
    ws1.append(headers_s1)
    for col_idx in range(1, len(headers_s1) + 1):
        cell = ws1.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    req_range_str = f"{comp['requested_start_date']} -> {comp['requested_end_date']}"
    act_range_str = f"{actual_start} -> {actual_end}"
    common_days = comp.get("common_trading_days_count", 0)

    for f in comp.get("funds_summary", []):
        ws1.append(
            [
                f.get("fund_code"),
                f.get("fund_title"),
                f.get("fund_type"),
                req_range_str,
                act_range_str,
                common_days,
                round(float(f.get("start_price") or 0.0), 6),
                round(float(f.get("end_price") or 0.0), 6),
                round(float(f.get("return_pct") or 0.0), 2),
                round(float(f.get("normalized_base_100_end") or 100.0), 2),
                round(float(f.get("max_drawdown_pct") or 0.0), 2),
                round(float(f.get("annualized_volatility_pct") or 0.0), 2),
            ]
        )

    # --- SAYFA 2: Günlük Zaman Serisi (Grafik Verileri) ---
    ws2 = wb.create_sheet(title="Günlük Zaman Serisi")
    headers_s2 = ["İşlem Günü (Tarih)"]
    for code in codes:
        headers_s2.append(f"{code} - Birim Pay Fiyatı (TL)")
        headers_s2.append(f"{code} - 100 Bazlı Endeks Değeri")
    ws2.append(headers_s2)
    for col_idx in range(1, len(headers_s2) + 1):
        cell = ws2.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    for pt in comp.get("daily_series", []):
        d_str = pt["date"]
        norm_map = pt.get("normalized", {})
        raw_map = raw_prices_by_date.get(d_str, {})
        row_vals: List[Any] = [d_str]
        for code in codes:
            raw_p = raw_map.get(code)
            norm_v = norm_map.get(code)
            row_vals.append(round(raw_p, 6) if raw_p is not None else "")
            row_vals.append(round(float(norm_v), 4) if norm_v is not None else "")
        ws2.append(row_vals)

    # --- SAYFA 3: Metodoloji ve Kaynak Notu ---
    ws3 = wb.create_sheet(title="Metodoloji ve Kaynak Notu")
    ws3.append(["Başlık / Alan", "Açıklama ve Resmi Doğrulama Notu"])
    for col_idx in (1, 2):
        cell = ws3.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font

    methodology_rows = [
        ("Veri Kaynağı", f"{comp.get('source', 'TEFAS / SQLite')} (%100 Gerçek Resmi TEFAS Kayıtları)"),
        ("Rapor Oluşturulma Zamanı", datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        ("Seçilen Fon Kodları", ", ".join(codes)),
        ("Kullanıcının İstediği Tarih Aralığı", req_range_str),
        ("Gerçekleşen Ortak İşlem Günü Aralığı", f"{act_range_str} ({common_days} ortak işlem günü)"),
        (
            "Tatil ve İşlem Günü Çözümleme Uyarısı",
            comp.get("date_warning")
            or "Seçilen başlangıç ve bitiş tarihleri doğrudan resmi TEFAS işlem günlerine denk gelmektedir.",
        ),
        (
            "100 Bazlı Normalizasyon Metodolojisi",
            "Farklı birim pay fiyatlarına sahip fonları (örn. 1.760 TL ile 0,60 TL) aynı ölçekte karşılaştırmak için başlangıç işlem günündeki (t=0) fiyat 100,00 kabul edilerek her gün N(t) = (Fiyat(t) / Fiyat(0)) * 100 formülüyle hesaplanmıştır.",
        ),
        (
            "Risk Metrikleri Metodolojisi",
            "Maksimum Düşüş (Max Drawdown %): Dönem içi zirveden dibe yaşanan en yüksek yüzdesel değer kaybıdır. Yıllık Volatilite (%): Günlük getirilerin standart sapmasının 252 işlem günü karekökü ile yıllıklandırılmış değeridir.",
        ),
        (
            "Yasal ve Akademik Şeffaflık Notu",
            "Bu rapor TÜBİTAK 2209-A Araştırma Projesi kapsamında resmi TEFAS verileriyle üretilmiştir. Geçmiş performans gelecekteki getirilerin garantisi değildir; yatırım tavsiyesi niteliği taşımaz.",
        ),
    ]
    for k, v in methodology_rows:
        ws3.append([k, v])

    # Tüm sayfalarda sütun genişliklerini otomatik ayarla
    for sheet in (ws1, ws2, ws3):
        for col in sheet.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                val_str = str(cell.value or "")
                if len(val_str) > max_len:
                    max_len = len(val_str)
            sheet.column_dimensions[col_letter].width = min(max(max_len + 4, 14), 65)

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    filename = f"fon_performans_analizi_{actual_start}_{actual_end}.xlsx"
    return StreamingResponse(
        iter([stream.getvalue()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# Modül D: Sanal Yatırım Sepeti Simülasyonu ve Kayıt/Listeleme
@app.post("/api/baskets/simulate")
def api_simulate_basket(req: BasketSimulateRequest) -> Dict[str, Any]:
    try:
        allocs = [{"fund_code": a.fund_code, "amount_tl": a.amount_tl} for a in req.allocations]
        return simulate_virtual_basket(
            allocations=allocs,
            start_date=req.start_date,
            end_date=req.end_date,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/baskets")
def api_list_saved_baskets() -> Dict[str, Any]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id FROM virtual_baskets ORDER BY id DESC;"
        ).fetchall()
    baskets = [load_basket(int(r["id"]), run_simulation=True) for r in rows]
    return {
        "count": len(baskets),
        "baskets": baskets,
    }


@app.post("/api/baskets/save")
def api_save_basket(req: BasketSaveRequest) -> Dict[str, Any]:
    try:
        allocs = [{"fund_code": a.fund_code, "amount_tl": a.amount_tl} for a in req.allocations]
        b_id = save_basket(
            basket_name=req.basket_name,
            allocations=allocs,
            start_date=req.start_date,
            end_date=req.end_date,
        )
        return load_basket(basket_id=b_id, run_simulation=True)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# Modül E: Kişisel Finans Raporu, Gelir/Gider İşlemleri ve Birikim Hedefleri (Backend Korundu)
@app.get("/api/finance/report")
def api_get_finance_report(month_prefix: str = Query(default="2026-10")) -> Dict[str, Any]:
    return get_financial_health_report(month_prefix=month_prefix)


@app.post("/api/finance/transactions")
def api_create_transaction(req: FinanceTransactionCreateRequest) -> Dict[str, Any]:
    try:
        tx_id = add_transaction(
            tx_type=req.tx_type,
            category=req.category,
            amount=req.amount,
            tx_date=req.tx_date,
            is_fixed=req.is_fixed,
            description=req.description,
        )
        return {
            "status": "CREATED",
            "transaction_id": tx_id,
            "updated_report": get_financial_health_report(month_prefix=req.tx_date[:7]),
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/finance/goals")
def api_create_savings_goal(req: SavingsGoalCreateRequest) -> Dict[str, Any]:
    try:
        goal_id = add_savings_goal(
            goal_name=req.goal_name,
            target_amount=req.target_amount,
            current_saved=req.current_saved,
            target_date=req.target_date,
            priority=req.priority,
        )
        return {
            "status": "CREATED",
            "goal_id": goal_id,
            "updated_report": get_financial_health_report(),
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# Modül F: Finansal Senaryo Simülatörü (Backend Korundu)
@app.post("/api/scenarios/simulate")
def api_simulate_scenarios(req: ScenarioSimulateRequest) -> Dict[str, Any]:
    try:
        return run_scenario_simulation(
            scenario_type=req.scenario_type,
            params=req.params,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# Modül H: Doğrulanabilir Finansal Karar Asistanı (Backend Korundu)
@app.post("/api/assistant/ask")
def api_ask_assistant(req: AssistantAskRequest) -> Dict[str, Any]:
    return ask_financial_assistant(
        user_query=req.user_query,
        context_fund_codes=req.context_fund_codes,
        start_date=req.start_date,
        end_date=req.end_date,
        month_prefix=req.month_prefix,
    )
