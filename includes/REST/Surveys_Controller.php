<?php
/**
 * Collaborative voting for Q2 Survey blocks.
 *
 * @package Q2
 */

declare( strict_types=1 );

namespace Q2\REST;

defined( 'ABSPATH' ) || exit;

/**
 * Stores one vote per member while keeping the survey definition in blocks.
 */
final class Surveys_Controller {
	private const META_KEY = '_q2_survey_votes';

	/**
	 * Hooks REST route registration.
	 */
	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Registers survey state and voting routes.
	 */
	public function register_routes(): void {
		register_rest_route(
			'q2/v1',
			'/surveys/(?P<post_id>\d+)/(?P<survey_id>[a-zA-Z0-9_-]+)',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $this, 'get_survey' ),
					'permission_callback' => array( $this, 'can_read_survey' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( $this, 'vote' ),
					'permission_callback' => array( $this, 'can_read_survey' ),
					'args'                => array(
						'option' => array(
							'required'          => true,
							'type'              => 'integer',
							'sanitize_callback' => 'absint',
						),
					),
				),
			)
		);
	}

	/**
	 * Ensures the current member can read the parent post.
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function can_read_survey( \WP_REST_Request $request ): bool {
		return is_user_logged_in() && current_user_can( 'read_post', absint( $request->get_param( 'post_id' ) ) );
	}

	/**
	 * Returns aggregate counts and the current member's vote.
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function get_survey( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$survey = $this->find_survey( absint( $request->get_param( 'post_id' ) ), sanitize_key( (string) $request->get_param( 'survey_id' ) ) );
		if ( is_wp_error( $survey ) ) {
			return $survey;
		}

		return rest_ensure_response( $this->state( absint( $request->get_param( 'post_id' ) ), $survey ) );
	}

	/**
	 * Creates or changes the current member's vote.
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function vote( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$post_id = absint( $request->get_param( 'post_id' ) );
		$survey  = $this->find_survey( $post_id, sanitize_key( (string) $request->get_param( 'survey_id' ) ) );
		if ( is_wp_error( $survey ) ) {
			return $survey;
		}

		$option = absint( $request->get_param( 'option' ) );
		if ( ! array_key_exists( $option, $survey['options'] ) ) {
			return new \WP_Error( 'q2_invalid_survey_option', __( 'That survey option is not available.', 'q2' ), array( 'status' => 400 ) );
		}

		$all_votes                         = get_post_meta( $post_id, self::META_KEY, true );
		$all_votes                         = is_array( $all_votes ) ? $all_votes : array();
		$all_votes[ $survey['survey_id'] ] = isset( $all_votes[ $survey['survey_id'] ] ) && is_array( $all_votes[ $survey['survey_id'] ] ) ? $all_votes[ $survey['survey_id'] ] : array();
		$all_votes[ $survey['survey_id'] ][ get_current_user_id() ] = $option;
		update_post_meta( $post_id, self::META_KEY, $all_votes );

		return rest_ensure_response( $this->state( $post_id, $survey ) );
	}

	/**
	 * Finds a survey definition in serialized post blocks.
	 *
	 * @param int    $post_id Parent post ID.
	 * @param string $survey_id Stable survey identifier.
	 * @return array{survey_id:string,options:array<int,string>}|\WP_Error
	 */
	private function find_survey( int $post_id, string $survey_id ): array|\WP_Error {
		$post = get_post( $post_id );
		if ( ! $post instanceof \WP_Post ) {
			return new \WP_Error( 'q2_survey_not_found', __( 'That survey could not be found.', 'q2' ), array( 'status' => 404 ) );
		}

		$pending = parse_blocks( $post->post_content );
		while ( ! empty( $pending ) ) {
			$block = array_shift( $pending );
			if ( 'q2/survey' === ( $block['blockName'] ?? '' ) && sanitize_key( (string) ( $block['attrs']['surveyId'] ?? '' ) ) === $survey_id ) {
				$options = array_values( array_filter( array_map( 'sanitize_text_field', (array) ( $block['attrs']['options'] ?? array() ) ) ) );
				return array(
					'survey_id' => $survey_id,
					'options'   => $options,
				);
			}
			$pending = array_merge( $pending, $block['innerBlocks'] ?? array() );
		}

		return new \WP_Error( 'q2_survey_not_found', __( 'That survey could not be found.', 'q2' ), array( 'status' => 404 ) );
	}

	/**
	 * Builds public aggregate state without exposing voter identities.
	 *
	 * @param int                                               $post_id Parent post ID.
	 * @param array{survey_id:string,options:array<int,string>} $survey Survey definition.
	 * @return array<string, mixed>
	 */
	private function state( int $post_id, array $survey ): array {
		$all_votes = get_post_meta( $post_id, self::META_KEY, true );
		$votes     = is_array( $all_votes ) && isset( $all_votes[ $survey['survey_id'] ] ) && is_array( $all_votes[ $survey['survey_id'] ] ) ? $all_votes[ $survey['survey_id'] ] : array();
		$counts    = array_fill( 0, count( $survey['options'] ), 0 );
		foreach ( $votes as $option ) {
			$option = absint( $option );
			if ( array_key_exists( $option, $counts ) ) {
				++$counts[ $option ];
			}
		}

		$user_vote = $votes[ get_current_user_id() ] ?? null;
		return array(
			'counts'   => $counts,
			'total'    => array_sum( $counts ),
			'userVote' => null === $user_vote ? null : absint( $user_vote ),
		);
	}
}
