<?php
declare( strict_types = 1 );

/**
 * Stub MobileContext class from MobileFrontend extension
 */
class MobileContext extends ContextSource {

	public static function singleton(): self {
		return new self();
	}

	/**
	 * Determine whether we should display the mobile view
	 *
	 * Step through the hierarchy of what should or should not trigger
	 * the mobile view.
	 *
	 * Primacy is given to the page action - we will never show the mobile view
	 * for page edits or page history. 'useformat' request param is then
	 * honored, followed by cookie settings, then actual device detection,
	 * finally falling back on false.
	 * @return bool
	 */
	public function shouldDisplayMobileView() {
		return false;
	}
}
