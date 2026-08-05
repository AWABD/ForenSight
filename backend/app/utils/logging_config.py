import logging
import sys
from app.config import settings

def setup_logger():
    # Set the base logging level from configuration
    log_level_str = settings.LOG_LEVEL.upper()
    log_level = getattr(logging, log_level_str, logging.INFO)

    # Base logging format
    log_format = "[%(asctime)s] [%(levelname)s] [%(name)s] (%(filename)s:%(lineno)d) - %(message)s"
    
    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format=log_format,
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )

    logger = logging.getLogger("forensight")
    logger.setLevel(log_level)
    return logger

logger = setup_logger()
