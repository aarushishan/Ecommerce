from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class CategoryBase(BaseModel):
    name: str
    slug: str
    image_url: Optional[str] = None
    parent_id: Optional[int] = None
    is_active: bool = True


class CategoryOut(CategoryBase):
    id: int
    product_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)
