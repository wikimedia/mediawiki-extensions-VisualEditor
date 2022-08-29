<?php

namespace MediaWiki\Extension\VisualEditor;

use ConfigException;
use MediaWiki\Config\ServiceOptions;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\MainConfigNames;
use MediaWiki\Parser\Parsoid\Config\PageConfigFactory;
use ParsoidVirtualRESTService;
use RestbaseVirtualRESTService;
use VirtualRESTService;
use VirtualRESTServiceClient;
use Wikimedia\Assert\Assert;
use Wikimedia\Parsoid\Config\DataAccess;
use Wikimedia\Parsoid\Config\SiteConfig;
use Wikimedia\UUID\GlobalIdGenerator;

class VisualEditorParsoidClientFactory {

	/**
	 * @internal For use by ServiceWiring.php only or when locating the service
	 * @var string
	 */
	public const SERVICE_NAME = 'VisualEditor.ParsoidClientFactory';

	/** @var bool */
	public const ENABLE_COOKIE_FORWARDING = 'EnableCookieForwarding';

	/** @var bool */
	public const USE_AUTO_CONFIG = 'VisualEditorParsoidAutoConfig';

	/**
	 * @internal For used by ServiceWiring.php
	 *
	 * @var array
	 */
	public const CONSTRUCTOR_OPTIONS = [
		MainConfigNames::ParsoidSettings,
		MainConfigNames::VirtualRestConfig,
		self::USE_AUTO_CONFIG,
		self::ENABLE_COOKIE_FORWARDING
	];

	/** @var SiteConfig */
	private $siteConfig;

	/** @var PageConfigFactory */
	private $pageConfigFactory;

	/** @var DataAccess */
	private $dataAccess;

	/** @var GlobalIdGenerator */
	private $globalIdGenerator;

	/** @var HttpRequestFactory */
	private $httpRequestFactory;

	/** @var VirtualRESTServiceClient */
	private $serviceClient = null;

	/** @var ServiceOptions */
	private $options;

	/** @var VisualEditorParsoidClient|false|null */
	private $directClient = false;

	/**
	 * @param ServiceOptions $options
	 * @param SiteConfig $siteConfig
	 * @param PageConfigFactory $pageConfigFactory
	 * @param DataAccess $dataAccess
	 * @param GlobalIdGenerator $globalIdGenerator
	 * @param HttpRequestFactory $httpRequestFactory
	 */
	public function __construct(
		ServiceOptions $options,
		SiteConfig $siteConfig,
		PageConfigFactory $pageConfigFactory,
		DataAccess $dataAccess,
		GlobalIdGenerator $globalIdGenerator,
		HttpRequestFactory $httpRequestFactory
	) {
		$this->options = $options;
		$this->options->assertRequiredOptions( self::CONSTRUCTOR_OPTIONS );

		$this->siteConfig = $siteConfig;
		$this->pageConfigFactory = $pageConfigFactory;
		$this->dataAccess = $dataAccess;
		$this->globalIdGenerator = $globalIdGenerator;
		$this->httpRequestFactory = $httpRequestFactory;
	}

	/**
	 * @return VisualEditorParsoidClient
	 */
	private function getVisualEditorParsoidClient(): VisualEditorParsoidClient {
		return new VisualEditorParsoidClient(
			$this->options->get( MainConfigNames::ParsoidSettings ),
			$this->siteConfig,
			$this->pageConfigFactory,
			$this->dataAccess,
			$this->globalIdGenerator
		);
	}

	/**
	 * Fetches the VisualEditorParsoidClient used for direct access to
	 * Parsoid.
	 * @return ?VisualEditorParsoidClient null if a VirtualRESTService is
	 *  to be used.
	 */
	public function getDirectClient(): ?VisualEditorParsoidClient {
		if ( $this->directClient === false ) {
			// We haven't checked configuration yet.
			// Check to see if any of the restbase-related configuration
			// variables are set, and bail if so:
			$vrs = $this->options->get( MainConfigNames::VirtualRestConfig );
			if ( isset( $vrs['modules'] ) &&
				( isset( $vrs['modules']['restbase'] ) ||
					isset( $vrs['modules']['parsoid'] ) )
			) {
				$this->directClient = null;
				return null;
			}
			// Eventually we'll do something fancy, but I'm hacking here...
			if ( !$this->options->get( self::USE_AUTO_CONFIG ) ) {
				// explicit opt out
				$this->directClient = null;
				return null;
			}
			$veClient = $this->getVisualEditorParsoidClient();
			// Default to using the direct client.
			$this->directClient = $veClient;
		}
		return $this->directClient;
	}

	/**
	 * Creates the virtual REST service object to be used in VE's API calls. The
	 * method determines whether to instantiate a ParsoidVirtualRESTService or a
	 * RestbaseVirtualRESTService object based on configuration directives: if
	 * $wgVirtualRestConfig['modules']['restbase'] is defined, RESTBase is chosen,
	 * otherwise Parsoid is used (either by using the MW Core config, or the
	 * VE-local one).
	 *
	 * @param string|string[]|false $forwardCookies False if header is unset; otherwise the
	 *  header value(s) as either a string (the default) or an array, if
	 *  WebRequest::GETHEADER_LIST flag was set.
	 *
	 * @return VirtualRESTService the VirtualRESTService object to use
	 */
	private function getVRSObject( $forwardCookies ): VirtualRESTService {
		Assert::precondition(
			!$this->getDirectClient(),
			"Direct Parsoid access is configured but the VirtualRESTService was used"
		);

		// the params array to create the service object with
		$params = [];
		// the VRS class to use, defaults to Parsoid
		$class = ParsoidVirtualRESTService::class;
		// The global virtual rest service config object, if any
		$vrs = $this->options->get( MainConfigNames::VirtualRestConfig );
		if ( isset( $vrs['modules'] ) && isset( $vrs['modules']['restbase'] ) ) {
			// if restbase is available, use it
			$params = $vrs['modules']['restbase'];
			// backward compatibility
			$params['parsoidCompat'] = false;
			$class = RestbaseVirtualRESTService::class;
		} elseif ( isset( $vrs['modules'] ) && isset( $vrs['modules']['parsoid'] ) ) {
			// there's a global parsoid config, use it next
			$params = $vrs['modules']['parsoid'];
			$params['restbaseCompat'] = true;
		} elseif ( $this->options->get( self::USE_AUTO_CONFIG ) ) {
			$params = $vrs['modules']['parsoid'] ?? [];
			$params['restbaseCompat'] = true;
			// forward cookies on private wikis
			$params['forwardCookies'] = $this->options->get( self::ENABLE_COOKIE_FORWARDING );
		} else {
			// No global modules defined, so no way to contact the document server.
			throw new ConfigException( "The VirtualRESTService for the document server is not defined;" .
				" see https://www.mediawiki.org/wiki/Extension:VisualEditor" );
		}
		// merge the global and service-specific params
		if ( isset( $vrs['global'] ) ) {
			$params = array_merge( $vrs['global'], $params );
		}
		// set up cookie forwarding
		if ( isset( $params['forwardCookies'] ) && $params['forwardCookies'] ) {
			$params['forwardCookies'] = $forwardCookies;
		} else {
			$params['forwardCookies'] = false;
		}
		// create the VRS object and return it
		return new $class( $params );
	}

	/**
	 * Creates the object which directs queries to the virtual REST service, depending on the path.
	 *
	 * @param string|string[]|false $forwardCookies False if header is unset; otherwise the
	 *  header value(s) as either a string (the default) or an array, if
	 *  WebRequest::GETHEADER_LIST flag was set.
	 *
	 * @return VirtualRESTServiceClient
	 */
	public function getVRSClient( $forwardCookies ): VirtualRESTServiceClient {
		if ( !$this->serviceClient ) {
			$this->serviceClient = new VirtualRESTServiceClient( $this->httpRequestFactory->createMultiClient() );
			$this->serviceClient->mount( '/restbase/', $this->getVRSObject( $forwardCookies ) );
		}
		return $this->serviceClient;
	}

}
