from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.category import CategoryOut
from app.services.product_service import ProductService

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=List[CategoryOut], status_code=status.HTTP_200_OK)
def list_categories(db: Session = Depends(get_db)):
    """
    Returns active product categories with associated product counts.
    """
    return ProductService.get_categories(db)
