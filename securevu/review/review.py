"""Run recording maintainer and cleanup."""

import logging
from multiprocessing.synchronize import Event as MpEvent

from securevu.config import SecureVuConfig
from securevu.const import PROCESS_PRIORITY_MED
from securevu.review.maintainer import ReviewSegmentMaintainer
from securevu.util.process import SecureVuProcess

logger = logging.getLogger(__name__)


class ReviewProcess(SecureVuProcess):
    def __init__(self, config: SecureVuConfig, stop_event: MpEvent) -> None:
        super().__init__(
            stop_event,
            PROCESS_PRIORITY_MED,
            name="securevu.review_segment_manager",
            daemon=True,
        )
        self.config = config

    def run(self) -> None:
        self.pre_run_setup(self.config.logger)
        maintainer = ReviewSegmentMaintainer(
            self.config,
            self.stop_event,
        )
        maintainer.start()
