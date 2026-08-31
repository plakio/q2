<?php
/**
 * Knowledge, search, media, and patterns REST resources.
 *
 * @package Q2
 */

declare( strict_types=1 );

namespace Q2\REST;

use Q2\Core\Capabilities;

defined( 'ABSPATH' ) || exit;

/**
 * Exposes knowledge discovery resources used by the Q2 application.
 *
 * Routes:
 *  - GET  /knowledge/patterns     — block patterns and starter markers
 *  - POST /knowledge/starters     — persist up to eight starter patterns
 *  - GET  /search                 — universal text search across content
 *  - GET  /knowledge/tags         — autocomplete tags
 */
final class Knowledge_Controller {
	/**
	 * Maximum starter patterns allowed.
	 */
	private const MAX_STARTERS = 8;

	/**
	 * Hooks REST registration.
	 */
	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Registers knowledge routes.
	 */
	public function register_routes(): void {
		register_rest_route(
			'q2/v1',
			'/knowledge/patterns',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_patterns' ),
				'permission_callback' => static fn(): bool => current_user_can( 'read' ),
			)
		);
		register_rest_route(
			'q2/v1',
			'/knowledge/starters',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'update_starters' ),
				'permission_callback' => static fn(): bool => current_user_can( Capabilities::MANAGE ),
				'args'                => array(
					'names' => array(
						'required' => true,
						'type'     => 'array',
						'items'    => array( 'type' => 'string' ),
					),
				),
			)
		);
		register_rest_route(
			'q2/v1',
			'/search',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'search' ),
				'permission_callback' => static fn(): bool => current_user_can( 'read' ),
				'args'                => array(
					'search' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'type'   => array(
						'type'              => 'string',
						'default'           => '',
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);
		register_rest_route(
			'q2/v1',
			'/knowledge/tags',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_tags' ),
				'permission_callback' => static fn(): bool => current_user_can( 'read' ),
				'args'                => array(
					'search' => array(
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);
	}

	/**
	 * Returns registered block patterns and starter state.
	 */
	public function get_patterns(): \WP_REST_Response {
		$starters = $this->starter_names();
		$registry = \WP_Block_Patterns_Registry::get_instance();
		$patterns = array_map(
			static function ( array $pattern ) use ( $starters ): array {
				return array(
					'name'        => (string) $pattern['name'],
					'title'       => wp_strip_all_tags( (string) $pattern['title'] ),
					'description' => wp_strip_all_tags( (string) ( $pattern['description'] ?? '' ) ),
					'content'     => (string) $pattern['content'],
					'categories'  => array_values( (array) ( $pattern['categories'] ?? array() ) ),
					'isStarter'   => in_array( $pattern['name'], $starters, true ),
				);
			},
			$registry->get_all_registered()
		);

		return rest_ensure_response(
			array(
				'patterns'    => $patterns,
				'starters'    => $starters,
				'maxStarters' => self::MAX_STARTERS,
			)
		);
	}

	/**
	 * Persists an ordered list of up to MAX_STARTERS starter patterns.
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function update_starters( \WP_REST_Request $request ): \WP_REST_Response {
		$registry = \WP_Block_Patterns_Registry::get_instance();
		$valid    = array_column( $registry->get_all_registered(), 'name' );

		$raw     = (array) $request->get_param( 'names' );
		$cleaned = array();
		foreach ( $raw as $name ) {
			$candidate = sanitize_text_field( (string) $name );
			if ( in_array( $candidate, $valid, true ) ) {
				$cleaned[] = $candidate;
			}
		}

		$starters = array_values( array_unique( array_slice( $cleaned, 0, self::MAX_STARTERS ) ) );
		update_option( 'q2_starter_patterns', $starters, false );

		return rest_ensure_response( array( 'names' => $starters ) );
	}

	/**
	 * Searches readable posts, pages, comments, people, and tags.
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function search( \WP_REST_Request $request ): \WP_REST_Response {
		$query = trim( (string) $request->get_param( 'search' ) );
		if ( '' === $query ) {
			return rest_ensure_response(
				array(
					'results' => array(),
					'counts'  => $this->empty_counts(),
				)
			);
		}

		$type_filter = (string) $request->get_param( 'type' );
		$results     = array();
		$counts      = $this->empty_counts();

		if ( '' === $type_filter || 'post' === $type_filter || 'page' === $type_filter ) {
			$types = array();
			if ( '' === $type_filter || 'post' === $type_filter ) {
				$types[] = 'post';
			}
			if ( '' === $type_filter || 'page' === $type_filter ) {
				$types[] = 'page';
			}

			$content = get_posts(
				array(
					'post_type'      => $types,
					'post_status'    => 'publish',
					'posts_per_page' => 20,
					's'              => $query,
				)
			);
			foreach ( $content as $post ) {
				if ( ! current_user_can( 'read_post', $post->ID ) ) {
					continue;
				}
				$post_title = get_the_title( $post );
				if ( '' === $post_title ) {
					$post_title = __( 'Untitled', 'q2' );
				}
				$results[] = array(
					'type'    => $post->post_type,
					'id'      => (int) $post->ID,
					'title'   => $post_title,
					'excerpt' => wp_trim_words( wp_strip_all_tags( $post->post_content ), 24 ),
					'url'     => get_permalink( $post ),
				);
				++$counts[ $post->post_type ];
			}
		}

		if ( '' === $type_filter || 'comment' === $type_filter ) {
			$comments = get_comments(
				array(
					'search' => $query,
					'status' => 'approve',
					'number' => 20,
				)
			);
			foreach ( $comments as $comment ) {
				if ( ! current_user_can( 'read_post', (int) $comment->comment_post_ID ) ) {
					continue;
				}
				$results[] = array(
					'type'    => 'comment',
					'id'      => (int) $comment->comment_ID,
					'postId'  => (int) $comment->comment_post_ID,
					'title'   => get_comment_author( $comment ),
					'excerpt' => wp_trim_words( wp_strip_all_tags( $comment->comment_content ), 24 ),
				);
				++$counts['comment'];
			}
		}

		if ( '' === $type_filter || 'person' === $type_filter ) {
			$people = get_users(
				array(
					'blog_id' => get_current_blog_id(),
					'search'  => '*' . $query . '*',
					'number'  => 10,
				)
			);
			foreach ( $people as $user ) {
				$results[] = array(
					'type'    => 'person',
					'id'      => (int) $user->ID,
					'title'   => $user->display_name,
					'excerpt' => '@' . $user->user_nicename,
				);
				++$counts['person'];
			}
		}

		if ( '' === $type_filter || 'tag' === $type_filter ) {
			$terms = get_terms(
				array(
					'taxonomy'   => 'post_tag',
					'search'     => $query,
					'number'     => 10,
					'hide_empty' => false,
				)
			);
			if ( ! is_wp_error( $terms ) ) {
				foreach ( $terms as $term ) {
					$results[] = array(
						'type'    => 'tag',
						'id'      => (int) $term->term_id,
						'title'   => $term->name,
						'excerpt' => $term->description,
					);
					++$counts['tag'];
				}
			}
		}

		return rest_ensure_response(
			array(
				'results' => $results,
				'counts'  => $counts,
			)
		);
	}

	/**
	 * Returns tags matching a query for autocomplete.
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function get_tags( \WP_REST_Request $request ): \WP_REST_Response {
		$query = trim( (string) $request->get_param( 'search' ) );
		$args  = array(
			'taxonomy'   => 'post_tag',
			'number'     => 20,
			'hide_empty' => false,
			'orderby'    => 'count',
			'order'      => 'DESC',
		);
		if ( '' !== $query ) {
			$args['search'] = $query;
		}

		$terms = get_terms( $args );
		if ( is_wp_error( $terms ) ) {
			return rest_ensure_response( array() );
		}

		return rest_ensure_response(
			array_map(
				static function ( \WP_Term $term ): array {
					return array(
						'id'    => (int) $term->term_id,
						'name'  => $term->name,
						'slug'  => $term->slug,
						'count' => (int) $term->count,
					);
				},
				$terms
			)
		);
	}

	/**
	 * Reads starter pattern names from the option store.
	 *
	 * @return string[]
	 */
	private function starter_names(): array {
		$stored = get_option( 'q2_starter_patterns', array() );
		return is_array( $stored ) ? array_values( array_filter( array_map( 'strval', $stored ) ) ) : array();
	}

	/**
	 * Initial empty counts structure.
	 *
	 * @return array<string, int>
	 */
	private function empty_counts(): array {
		return array(
			'post'    => 0,
			'page'    => 0,
			'comment' => 0,
			'person'  => 0,
			'tag'     => 0,
		);
	}
}
