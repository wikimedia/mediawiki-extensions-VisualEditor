<?php

namespace MediaWiki\Extension\VisualEditor;

use ConfigException;
use IBufferingStatsdDataFactory;
use MediaWiki\Config\ServiceOptions;
use MediaWiki\Edit\ParsoidOutputStash;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\MainConfigNames;
use MediaWiki\Parser\Parsoid\HTMLTransformFactory;
use MediaWiki\Parser\Parsoid\ParsoidOutputAccess;
use MediaWiki\Permissions\Authority;
use ParsoidVirtualRESTService;
use Psr\Log\LoggerInterface;
use RequestContext;
use RestbaseVirtualRESTService;
use VirtualRESTService;
use VirtualRESTServiceClient;

/**
 * @since 1.40
 */
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
		MainConfigNames::VirtualRestConfig,
		self::USE_AUTO_CONFIG,
		self::ENABLE_COOKIE_FORWARDING
	];

	/** @var HttpRequestFactory */
	private $httpRequestFactory;

	/** @var VirtualRESTServiceClient */
	private $serviceClient = null;

	/** @var ServiceOptions */
	private $options;

	/** @var LoggerInterface */
	private $logger;

	/** @var ParsoidOutputStash */
	private $parsoidOutputStash;

	/** @var IBufferingStatsdDataFactory */
	private $statsDataFactory;

	/** @var ParsoidOutputAccess */
	private $parsoidOutputAccess;

	/** @var HTMLTransformFactory */
	private $htmlTransformFactory;

	/**
	 * @param ServiceOptions $options
	 * @param HttpRequestFactory $httpRequestFactory
	 * @param LoggerInterface $logger
	 * @param ParsoidOutputStash $parsoidOutputStash
	 * @param IBufferingStatsdDataFactory $statsDataFactory
	 * @param ParsoidOutputAccess $parsoidOutputAccess
	 * @param HTMLTransformFactory $htmlTransformFactory
	 */
	public function __construct(
		ServiceOptions $options,
		HttpRequestFactory $httpRequestFactory,
		LoggerInterface $logger,
		ParsoidOutputStash $parsoidOutputStash,
		IBufferingStatsdDataFactory $statsDataFactory,
		ParsoidOutputAccess $parsoidOutputAccess,
		HTMLTransformFactory $htmlTransformFactory
	) {
		$this->options = $options;
		$this->options->assertRequiredOptions( self::CONSTRUCTOR_OPTIONS );

		$this->httpRequestFactory = $httpRequestFactory;
		$this->logger = $logger;
		$this->parsoidOutputStash = $parsoidOutputStash;
		$this->statsDataFactory = $statsDataFactory;
		$this->parsoidOutputAccess = $parsoidOutputAccess;
		$this->htmlTransformFactory = $htmlTransformFactory;
	}

	/**
	 * Create a ParsoidClient for accessing Parsoid.
	 *
	 * @param string|string[]|false $cookiesToForward
	 * @param Authority|null $performer
	 *
	 * @return ParsoidClient
	 */
	public function createParsoidClient( $cookiesToForward, ?Authority $performer = null ): ParsoidClient {
		if ( $performer === null ) {
			$performer = RequestContext::getMain()->getAuthority();
		}

		if ( $this->useRestbase() ) {
			$client = new VRSParsoidClient(
				$this->getVRSClient( $cookiesToForward ),
				$this->logger
			);
		} else {
			$client = $this->createDirectClient( $performer );
		}

		return $client;
	}

	public function useRestbase(): bool {
		// We haven't checked configuration yet.
		// Check to see if any of the restbase-related configuration
		// variables are set, and bail if so:
		$vrs = $this->options->get( MainConfigNames::VirtualRestConfig );
		if ( isset( $vrs['modules'] ) &&
			( isset( $vrs['modules']['restbase'] ) ||
				isset( $vrs['modules']['parsoid'] ) )
		) {
			return true;
		}

		// Eventually we'll do something fancy, but I'm hacking here...
		if ( !$this->options->get( self::USE_AUTO_CONFIG ) ) {
			// explicit opt out
			return true;
		}

		return false;
	}

	/**
	 * Create a ParsoidClient for accessing Parsoid.
	 *
	 * @param Authority $performer
	 *
	 * @return ParsoidClient
	 */
	private function createDirectClient( Authority $performer ): ParsoidClient {
		return new DirectParsoidClient(
			$this->parsoidOutputStash,
			$this->statsDataFactory,
			$this->parsoidOutputAccess,
			$this->htmlTransformFactory,
			$performer
		);
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
	private function createVRSObject( $forwardCookies ): VirtualRESTService {
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
	 * @param string|string[]|false $cookiesToForward False if header is unset; otherwise the
	 *  header value(s) as either a string (the default) or an array, if
	 *  WebRequest::GETHEADER_LIST flag was set.
	 *
	 * @return VirtualRESTServiceClient
	 */
	private function getVRSClient( $cookiesToForward ): VirtualRESTServiceClient {
		if ( !$this->serviceClient ) {
			$this->serviceClient = new VirtualRESTServiceClient( $this->httpRequestFactory->createMultiClient() );
			$this->serviceClient->mount( '/restbase/', $this->createVRSObject( $cookiesToForward ) );
		}
		return $this->serviceClient;
	}

}
