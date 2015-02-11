/*!
 * VisualEditor DataModel MWMediaResourceProvider class.
 *
 * @copyright 2011-2015 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * MediaWiki media resource provider.
 *
 * @class
 * @mixins OO.EventEmitter
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.dm.MWMediaResourceProvider = function VeDmMWMediaResourceProvider( config ) {
	config = config || {};

	// Source Configuration
	this.apiurl = this.setAPIurl( config.apiurl );
	this.name = config.name;
	this.displayName = config.displayName;
	this.local = config.local;
	this.scriptDirUrl  = config.scriptDirUrl;

	// ajaxOptions configuration
	this.dataType = config.dataType || 'jsonp';
	this.cached = config.cached || true;

	// Fetching configuration
	this.fetchLimit = config.limit || 30;
	this.iiprop = config.iiprop || [ 'dimensions', 'url', 'mediatype', 'extmetadata', 'timestamp', 'user' ];
	this.fetchProp = config.fetchProp || 'imageinfo';
	this.lang = config.lang || 'en';

	this.siteInfoPromise = null;
	this.thumbSizes = [];
	this.imageSizes = [];

	this.depleted = false;
	this.offset = config.offset || 0;
	this.setQuery( config.query || '' );

	// Mixin constructors
	OO.EventEmitter.call( this );
};

/* Setup */
OO.initClass( ve.dm.MWMediaResourceProvider );
OO.mixinClass( ve.dm.MWMediaResourceProvider, OO.EventEmitter );

/* Methods */

/**
 * Initialize the source and get the site info.
 *
 * Connect to the api url and retrieve the siteinfo parameters
 * that are required for fetching results.
 *
 * @return {jQuery.Promise} Promise that resolves when the class
 * properties are set.
 */
ve.dm.MWMediaResourceProvider.prototype.loadSiteInfo = function () {
	var provider = this;

	if ( !this.siteInfoPromise ) {
		this.siteInfoPromise = ve.init.target.constructor.static.apiRequest( {
			action: 'query',
			meta: 'siteinfo'
		} )
			.then( function ( data ) {
				if ( data.error ) {
					return $.Deferred().reject();
				}
				provider.setImageSizes( ve.getProp( data, 'query', 'general', 'imagelimits' ) || [] );
				provider.setThumbSizes( ve.getProp( data, 'query', 'general', 'thumblimits' ) || [] );
			} );
	}
	return this.siteInfoPromise;
};

/**
 * Get results from the source
 *
 * @return {jQuery.Promise} Promise that is resolved into an array
 * of available results, or is rejected if no results are available.
 */
ve.dm.MWMediaResourceProvider.prototype.getResults = function ( howMany ) {
	var xhr,
		aborted = false,
		provider = this;

	return this.loadSiteInfo()
		.then( function () {
			if ( aborted ) {
				return $.Deferred().reject();
			}
			xhr = provider.fetchAPIresults( howMany );
			return xhr;
		} )
		.then(
			function ( results ) {
				if ( results.length === 0 ) {
					provider.toggleDepleted( true );
				}
				return results;
			},
			// Process failed, return an empty promise
			function () {
				provider.toggleDepleted( true );
				return $.Deferred().resolve( [] );
			}
		)
		.promise( { abort: function () {
			aborted = true;
			if ( xhr ) {
				xhr.abort();
			}
		} } );
};

/**
 * Call the API for search results.
 *
 * @param {number} howMany The number of results to retrieve
 * @return {jQuery.Promise} Promise that resolves with an array of objects that contain
 *  the fetched data.
 */
ve.dm.MWMediaResourceProvider.prototype.fetchAPIresults = function ( howMany ) {
	var xhr,
		ajaxOptions = {},
		query = this.getQuery(),
		provider = this,
		apiCallConfig = {
			action: 'query',
			generator: 'search',
			gsrsearch: query,
			gsrnamespace: 6,
			continue: '',
			gsroffset: this.getOffset(),
			prop: this.getFetchProp(),
			// Language of the extmetadata details
			iiextmetadatalanguage: this.getLang(),
			iiprop: this.getIiProp().join( '|' ),
			iiurlheight: this.getMaxHeight(),
			// Standard width per resource
			iiurlwidth: this.getStandardWidth()
		};

	howMany = howMany || 20;
	// Initial number of images
	apiCallConfig.gsrlimit = howMany;

	if ( this.isValid() ) {
		if ( this.isLocal() ) {
			ajaxOptions = {
				url: mw.util.wikiScript( 'api' ),
				// If the url is local use json
				dataType: 'json'
			};
		} else {
			ajaxOptions = {
				// If 'apiurl' is set, use that. Otherwise, build the url
				// from scriptDirUrl and /api.php suffix
				url: this.apiurl || ( this.scriptDirUrl + '/api.php' ),
				// If the url is not the same origin use jsonp
				dataType: 'jsonp',
				// JSON-P requests are not cached by default and get a &_=random trail.
				// While setting cache=true will still bypass cache in most case due to the
				// callback parameter, at least drop the &_=random trail which triggers
				// an API warning (invalid parameter).
				cache: true
			};
		}

		xhr = ve.init.target.constructor.static.apiRequest( apiCallConfig, ajaxOptions );
		return xhr
			.then( function ( data ) {
				var page, newObj,
					results = [],
					raw = ve.getProp( data, 'query', 'pages' );
				if ( data[ 'continue' ] ) {
					// Update the offset for next time
					provider.setOffset( data[ 'continue' ].gsroffset );
				} else {
					// This is the last available set of result. Mark as depleted!
					provider.toggleDepleted( true );
				}
				if ( raw ) {
					// Strip away the page ids
					for ( page in raw ) {
						if ( !raw[page].imageinfo ) {
							// The search may give us pages that belong to the File:
							// namespace but have no files in them, either because
							// they were deleted or imported wrongly, or just started
							// as pages. In that case, the response will not include
							// imageinfo. Skip those files.
							continue;
						}
						newObj = raw[page].imageinfo[0];
						newObj.title = raw[page].title;
						results.push( newObj );
					}
				}
				return results;
			} )
			.promise( { abort: xhr.abort } );
	}
};

/**
 * Get search query
 *
 * @return {string} search query
 */
ve.dm.MWMediaResourceProvider.prototype.getQuery = function () {
	return this.query;
};

/**
 * Set search query
 *
 * @param {string} value
 */
ve.dm.MWMediaResourceProvider.prototype.setQuery = function ( value ) {
	if ( this.query !== value ) {
		this.query = value;
		// Reset offset
		this.setOffset( 0 );
		// Reset depleted status
		this.toggleDepleted( false );
	}
};
/**
 * Set api url
 *
 * @param {string} API url
 */
ve.dm.MWMediaResourceProvider.prototype.setAPIurl = function ( url ) {
	this.apiurl = url;
};

/**
 * Set api url
 *
 * @return {string} API url
 */
ve.dm.MWMediaResourceProvider.prototype.getAPIurl = function () {
	return this.apiurl;
};

/**
 * Set name
 *
 * @param {string} name
 */
ve.dm.MWMediaResourceProvider.prototype.setName = function ( name ) {
	this.name = name;
};

/**
 * Get name
 *
 * @returns {string} name
 */
ve.dm.MWMediaResourceProvider.prototype.getName = function () {
	return this.name;
};

/**
 * Get displayName
 *
 * @return {string} displayName
 */
ve.dm.MWMediaResourceProvider.prototype.getDisplayName = function () {
	return this.displayName;
};

/**
 * Set displayName
 *
 * @param {string} displayName
 */
ve.dm.MWMediaResourceProvider.prototype.setDisplayName = function ( displayName ) {
	this.displayName = displayName;
};

/**
 * Get isLocal value
 *
 * @return {boolean} isLocal value
 */
ve.dm.MWMediaResourceProvider.prototype.isLocal = function () {
	return this.local;
};

/**
 * Get ScriptDirUrl
 *
 * @return {string} ScriptDirUrl
 */
ve.dm.MWMediaResourceProvider.prototype.getScriptDirUrl = function () {
	return this.scriptDirUrl;
};

/**
 * Set scriptDirUrl
 *
 * @param {string} scriptDirUrl
 */
ve.dm.MWMediaResourceProvider.prototype.setScriptDirUrl = function ( scriptDirUrl ) {
	this.scriptDirUrl = scriptDirUrl;
};

/**
 * Get dataType
 *
 * @return {string} dataType
 */
ve.dm.MWMediaResourceProvider.prototype.getDataType = function () {
	return this.dataType;
};

/**
 * Set dataType
 *
 * @param {string} dataType
 */
ve.dm.MWMediaResourceProvider.prototype.setDataType = function ( dataType ) {
	this.dataType = dataType;
};

/**
 * Get cached
 *
 * @return {boolean} cached
 */
ve.dm.MWMediaResourceProvider.prototype.isCached = function () {
	return this.cached;
};

/**
 * Get fetch limit or 'page' size. This is the number
 * of results per request.
 *
 * @return {number} limit
 */
ve.dm.MWMediaResourceProvider.prototype.getFetchLimit = function () {
	return this.limit;
};

/**
 * Set limit
 *
 * @param {number} limit
 */
ve.dm.MWMediaResourceProvider.prototype.setFetchLimit = function ( limit ) {
	this.limit = limit;
};

/**
 * Get properties
 *
 * @return {string[]} properties
 */
ve.dm.MWMediaResourceProvider.prototype.getIiProp = function () {
	return this.iiprop;
};

/**
 * Get max height
 *
 * @return {number|undefined} Maximum height
 */
ve.dm.MWMediaResourceProvider.prototype.getMaxHeight = function () {
	return this.maxHeight;
};

/**
 * Set maximum height
 *
 * @param {number} Maximum height
 */
ve.dm.MWMediaResourceProvider.prototype.setMaxHeight = function ( maxHeight ) {
	this.maxHeight = maxHeight;
};

/**
 * Get standard width, based on the provider source's thumb sizes.
 *
 * @return {number|undefined} fetchWidth
 */
ve.dm.MWMediaResourceProvider.prototype.getStandardWidth = function () {
	return this.thumbSizes && this.thumbSizes[ this.thumbSizes.length - 1 ];
};

/**
 * Get prop
 *
 * @return {string} prop
 */
ve.dm.MWMediaResourceProvider.prototype.getFetchProp = function () {
	return this.fetchProp;
};

/**
 * Set prop
 *
 * @param {string} prop
 */
ve.dm.MWMediaResourceProvider.prototype.setFetchProp = function ( prop ) {
	this.fetchProp = prop;
};

/**
 * Get lang
 *
 * @return {string} lang
 */
ve.dm.MWMediaResourceProvider.prototype.getLang = function () {
	return this.lang;
};

/**
 * Set lang
 *
 * @param {string} lang
 */
ve.dm.MWMediaResourceProvider.prototype.setLang = function ( lang ) {
	this.lang = lang;
};

/**
 * Get Offset
 *
 * @return {number} Offset
 */
ve.dm.MWMediaResourceProvider.prototype.getOffset = function () {
	return this.offset;
};

/**
 * Set Offset
 *
 * @param {number} Offset
 */
ve.dm.MWMediaResourceProvider.prototype.setOffset = function ( offset ) {
	this.offset = offset;
};

/**
 * Set thumb sizes
 *
 * @param {number[]} sizes Available thumbnail sizes
 */
ve.dm.MWMediaResourceProvider.prototype.setThumbSizes = function ( sizes ) {
	this.thumbSizes = sizes;
};

/**
 * Set image sizes
 *
 * @param {number[]} sizes Available image sizes
 */
ve.dm.MWMediaResourceProvider.prototype.setImageSizes = function ( sizes ) {
	this.imageSizes = sizes;
};

/**
 * Get thumb sizes
 *
 * @returns {number[]} sizes Available thumbnail sizes
 */
ve.dm.MWMediaResourceProvider.prototype.getThumbSizes = function () {
	return this.thumbSizes;
};

/**
 * Get image sizes
 *
 * @returns {number[]} sizes Available image sizes
 */
ve.dm.MWMediaResourceProvider.prototype.getImageSizes = function () {
	return this.imageSizes;
};

/**
 * Check whether the provider is depleted
 *
 * @return {boolean} depleted
 */
ve.dm.MWMediaResourceProvider.prototype.isDepleted = function () {
	return this.depleted;
};

/**
 * Toggle depleted state
 *
 * @param {boolean} depleted
 */
ve.dm.MWMediaResourceProvider.prototype.toggleDepleted = function ( isDepleted ) {
	this.depleted = isDepleted !== undefined ? isDepleted : !this.depleted;
};

/**
 * Check if this source is valid and ready for search.
 * @return {boolean} Source is valid
 */
ve.dm.MWMediaResourceProvider.prototype.isValid = function () {
	return this.getQuery() &&
		(
			// If we don't have either 'apiurl' or 'scriptDirUrl'
			// the source is invalid, and we will skip it
			this.apiurl || this.scriptDirUrl !== undefined
		);
};
