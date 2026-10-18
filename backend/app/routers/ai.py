from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_optional_current_user
from app.models.user import User
from app.schemas.product import ProductSummaryOut
from app.schemas.ai import (
    ChatRequest,
    ChatResponse,
    SemanticSearchOut,
    ProductComparisonRequest,
    ProductComparisonOut
)
from app.services.ai_service import AIService

router = APIRouter(prefix="/ai", tags=["AI & Recommendations"])


@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
def chat_with_assistant(
    request: ChatRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Conversational AI Shopping Assistant ('SphereBot') grounded in the active catalog.
    Handles product search, side-by-side comparisons, order status lookups, and policy FAQs.
    Guaranteed zero hallucination by retrieving and verifying active database records.
    """
    return AIService.chat_with_assistant(
        db=db,
        query=request.query,
        user=current_user,
        context=request.context
    )


@router.get("/recommendations/similar/{product_id}", response_model=List[ProductSummaryOut])
def get_similar_products(
    product_id: str,
    limit: int = Query(6, ge=1, le=20, description="Max similar products to return"),
    db: Session = Depends(get_db)
):
    """
    Content-based recommendation engine utilizing vector cosine similarity
    across title, brand, category metadata, and product descriptions.
    """
    return AIService.get_similar_products(db=db, product_id=product_id, limit=limit)


@router.get("/recommendations/frequently-bought-together/{product_id}", response_model=List[ProductSummaryOut])
def get_frequently_bought_together(
    product_id: str,
    limit: int = Query(3, ge=1, le=10, description="Max complementary products to return"),
    db: Session = Depends(get_db)
):
    """
    Identifies frequently co-purchased items from order history with catalog complementary fallback.
    """
    return AIService.get_frequently_bought_together(db=db, product_id=product_id, limit=limit)


@router.get("/recommendations/for-you", response_model=List[ProductSummaryOut])
def get_recommendations_for_you(
    limit: int = Query(8, ge=1, le=24, description="Max recommended products to return"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Personalized recommendation feed based on the user's category affinity,
    recent orders, or top trending and featured items.
    """
    return AIService.get_recommendations_for_you(db=db, user=current_user, limit=limit)


@router.post("/compare", response_model=ProductComparisonOut, status_code=status.HTTP_200_OK)
def compare_products(
    request: ProductComparisonRequest,
    db: Session = Depends(get_db)
):
    """
    Smart Side-by-Side Product Comparison Matrix.
    Extracts structured specifications, highlights differentiators,
    and produces an algorithmic value-for-money verdict across 2-4 products.
    """
    try:
        return AIService.compare_products(db=db, product_ids=request.product_ids)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/semantic-search", response_model=SemanticSearchOut, status_code=status.HTTP_200_OK)
def semantic_search(
    q: str = Query(..., min_length=1, description="Natural language search query"),
    limit: int = Query(12, ge=1, le=50, description="Max results to return"),
    db: Session = Depends(get_db)
):
    """
    Semantic search and natural language filter parser.
    Extracts price bounds, category hints, quality criteria, and scores
    products using vector cosine similarity.
    """
    return AIService.semantic_search(db=db, query_text=q, limit=limit)
