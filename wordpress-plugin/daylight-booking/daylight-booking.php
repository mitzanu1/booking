<?php
/**
 * Plugin Name: Daylight Booking Button
 * Description: Adds a button that opens the hosted Daylight booking widget.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

function daylight_booking_enqueue_assets() {
    $base_url = plugin_dir_url(__FILE__);
    wp_enqueue_style('daylight-booking', $base_url . 'daylight-booking.css', array(), '1.0.0');
    wp_enqueue_script('daylight-booking', $base_url . 'daylight-booking.js', array(), '1.0.0', true);
}
add_action('wp_enqueue_scripts', 'daylight_booking_enqueue_assets');

function daylight_booking_shortcode($attributes) {
    $attributes = shortcode_atts(
        array('url' => 'https://YOUR-VERCEL-DOMAIN/widget'),
        $attributes,
        'daylight_book_now'
    );
    $widget_url = esc_url($attributes['url']);
    $dialog_id = wp_unique_id('daylight-booking-');

    if (!$widget_url) {
        return '';
    }

    return sprintf(
        '<button class="daylight-booking-open" type="button" aria-haspopup="dialog" aria-controls="%1$s">Book now</button>
        <dialog class="daylight-booking-dialog" id="%1$s" aria-label="Book an appointment">
            <div class="daylight-booking-dialog-header">
                <span>Book an appointment</span>
                <button class="daylight-booking-close" type="button" aria-label="Close booking">Close</button>
            </div>
            <iframe src="%2$s" title="Appointment booking" loading="lazy"></iframe>
        </dialog>',
        esc_attr($dialog_id),
        $widget_url
    );
}
add_shortcode('daylight_book_now', 'daylight_booking_shortcode');
