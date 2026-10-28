from pydantic import BaseModel, HttpUrl, Field
from typing import List, Optional, Literal
from uuid import UUID, uuid4
from datetime import datetime
from enum import Enum

class TaskStatus(str, Enum):
    PENDING = "PENDING"
    SCRAPING = "SCRAPING"
    ANALYZING = "ANALYZING"
    VERIFYING = "VERIFYING"
    CURATING = "CURATING"
    WRITING = "WRITING"
    GENERATING = "GENERATING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class ResearchRequest(BaseModel):
    url: HttpUrl

class Evidence(BaseModel):
    source_id: Optional[int] = None
    url: str
    quote: str = ""
    stance: Literal["supports", "contradicts", "context"] = "context"

class ClaimCheck(BaseModel):
    id: int
    claim: str
    quote: str = ""
    verdict: Literal["supported", "contradicted", "partially_true", "outdated", "unverifiable"]
    confidence: int = 0
    explanation: str = ""
    correction: str = ""
    evidence: List[Evidence] = []

class Source(BaseModel):
    id: int
    title: str
    url: str
    domain: str
    credibility: Literal["high", "medium", "low"]
    link_status: Literal["live", "protected", "dead"] = "dead"
    claim_ids: List[int] = []
    recommended: bool = False

class TimelineEvent(BaseModel):
    date: str
    event: str

class ResearchDocument(BaseModel):
    summary: str
    insights: List[str]
    content: str
    validation: str
    risks: str
    comparison: str
    pdf_url: Optional[str] = None
    # Fact-check fields - absent on reports created before the multi-agent pipeline
    title: Optional[str] = None
    source_url: Optional[str] = None
    verdict_summary: Optional[str] = None
    credibility_score: Optional[int] = None
    timeline: List[TimelineEvent] = []
    claims: List[ClaimCheck] = []
    sources: List[Source] = []

class ResearchTask(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    url: str
    status: TaskStatus = TaskStatus.PENDING
    document: Optional[ResearchDocument] = None
    progress: Optional[dict] = None
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: List[ChatTurn] = []

class ChatResponse(BaseModel):
    answer: str
