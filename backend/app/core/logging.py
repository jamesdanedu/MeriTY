# app/core/logging.py

import sys
from loguru import logger
from typing import Dict, Any

# Configure default logging format
logger.configure(
    handlers=[
        {
            "sink": sys.stdout,
            "format": "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
            "colorize": True,
            "enqueue": True,
        }
    ]
)

def setup_logging(config: Dict[str, Any] = None) -> None:
    """
    Configure logging with custom settings if provided
    
    Args:
        config: Dictionary containing logging configuration
    """
    if config:
        # Remove default handler
        logger.remove()
        # Add new handler with custom configuration
        logger.configure(**config)

# Log format for file output (if needed)
LOG_FORMAT = "{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}"

def add_file_handler(filename: str, rotation: str = "500 MB", retention: str = "10 days") -> None:
    """
    Add a file handler to the logger
    
    Args:
        filename: Path to the log file
        rotation: When to rotate the log file (size or time)
        retention: How long to keep log files
    """
    logger.add(
        filename,
        format=LOG_FORMAT,
        rotation=rotation,
        retention=retention,
        compression="zip",
        enqueue=True
    )

# Create a function to get logger for specific modules
def get_logger(name: str = None):
    """
    Get a logger instance for a specific module
    
    Args:
        name: Name of the module (defaults to None)
    
    Returns:
        Logger instance
    """
    return logger.bind(name=name)

# Export the logger instance
__all__ = ["logger", "setup_logging", "add_file_handler", "get_logger"]
