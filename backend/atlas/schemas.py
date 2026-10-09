from typing import Literal
from pydantic import BaseModel, Field, ConfigDict


class StrictModel(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False, extra="forbid")


class ShockRequest(StrictModel):
    coefficients: list[list[float]] = Field(max_length=500, min_length=1)
    shock: list[float] = Field(max_length=500, min_length=1)
    mode: Literal["price", "quantity"] = "price"


class BondRequest(StrictModel):
    face: float = Field(default=100, gt=0, le=1e9)
    coupon: float = Field(default=0.04, ge=0, le=1)
    yield_rate: float = Field(default=0.04, gt=-0.5, le=1)
    years: float = Field(default=10, gt=0, le=100)
    frequency: Literal[1, 2, 4] = 2
    shift_bp: float = Field(default=100, ge=-1000, le=1000)


class PortfolioRequest(StrictModel):
    csv_text: str = Field(max_length=3_000_000)
    total_return_confirmed: Literal[True]
    source: str = Field(min_length=3, max_length=300)
    weights: list[float] = Field(min_length=2, max_length=20)
    periods: Literal[12, 52, 252] = 252
    method: Literal["variance", "cvar"] = "variance"
    cap: float = Field(default=1, gt=0, le=1)
    turnover_limit: float = Field(default=2, ge=0, le=2)
    cost_bps: float = Field(default=0, ge=0, le=500)

class ForecastRequest(StrictModel):
    window: list[list[float]] = Field(min_length=5, max_length=5)
    model: Literal['gru_multivariate_seed17','gru_multivariate_seed29','gru_multivariate_seed43','gru_domestic_only_seed17','gru_domestic_only_seed29','gru_domestic_only_seed43'] = 'gru_multivariate_seed17'

class ObservationResponse(BaseModel):
    entity: str
    indicator: str
    value: float | None
    year: int
    unit: str
    observation_date: str | None = None
    publication_date: str | None = None
    vintage: str | None = None
    retrieved_at: str | None = None
    source: str | None = None
    quality_flag: str | None = None

class CountryResponse(BaseModel):
    id: str
    wb_id: str
    name: str
    region: str
    subregion: str
    longitude: float
    latitude: float
    indicators: dict[str,ObservationResponse]

class CountriesResponse(BaseModel):
    kind: Literal['observed']
    year: int
    countries: list[CountryResponse]

class CountryDetailResponse(CountryResponse):
    observations: list[ObservationResponse]
    kind: Literal['observed']
    vintage_warning: str
