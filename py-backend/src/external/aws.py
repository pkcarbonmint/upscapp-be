from fastapi import APIRouter, Depends
from src.users.models import User
from src.auth.deps import valid_token_user
import boto3
from src.config import settings
import uuid
import logging
from os import path
from urllib import parse

router = APIRouter(tags=["s3-url"])


@router.post("/s3-url")
async def get_signed_s3_url(
    file_name: str | None = None,
    file_ext: str | None = None,
    content_mime_type: str | None = None,
    is_public: bool = True,
    current_user: User = Depends(valid_token_user),
):
    # name, ext = path.splitext(file_name) if file_name else ("", "")
    # name = file_name.split(".")[0:len(file_name)-len(file_ext)]
    ext2 = content_mime_type and content_mime_type.split("/")[-1]

    file_name_with_ext = file_name or ""
    if file_ext:
        file_name_with_ext += "." + file_ext
    elif ext2:
        file_name_with_ext += "." + ext2

    file_key = uuid.uuid4().__str__() + file_name_with_ext
    s3_client = boto3.client(
        "s3",
        region_name=settings.REGION_NAME,
        aws_access_key_id=settings.AWS_SECRET_ACCESS_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )

    # Generate presigned URL
    try:
        response = s3_client.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": settings.BUCKET_NAME,
                "Key": file_key,
            },
            ExpiresIn=3600,
        )
    except Exception as e:
        print(e)
        return logging.error(e)

    # The response contains the presigned URL
    # print(parse.urlparse(response))
    parsed_url = parse.urlparse(response)
    return {
        "pre_signed_url": response,
        "s3_file_url": f"{parsed_url.scheme}://{parsed_url.netloc}{parsed_url.path}",  # f"https://{settings.BUCKET_NAME}.s3.{settings.REGION_NAME}.amazonaws.com/{file_key}",
    }
