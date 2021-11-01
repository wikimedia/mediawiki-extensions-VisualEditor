/**
 * Mixin for adding descriptive ARIA support to elements.
 *
 * @class
 * @abstract
 *
 * @constructor
 * @param {Object} [config] Configuration options
 * @cfg {string} [ariaDescriptionId]
 * @cfg {string} [ariaLabel]
 */
ve.ui.MWAriaDescribe = function VeUiMWAriaDescribe( config ) {
	if ( config.ariaDescriptionId ) {
		this.setAriaDescriptionId( config.ariaDescriptionId );
	}

	if ( config.ariaLabel ) {
		this.setAriaLabel( config.ariaLabel );
	}
};

/* Setup */

OO.initClass( ve.ui.MWAriaDescribe );

/**
 * @param {string} id
 * @chainable
 * @return {OO.ui.Element} The element, for chaining
 */
ve.ui.MWAriaDescribe.prototype.setAriaDescriptionId = function ( id ) {
	this.$element.attr( 'aria-describedby', id );
	return this;
};

/**
 * @param {string} label
 * @chainable
 * @return {OO.ui.Element} The element, for chaining
 */
ve.ui.MWAriaDescribe.prototype.setAriaLabel = function ( label ) {
	this.$element.attr( 'aria-label', label );
	return this;
};
