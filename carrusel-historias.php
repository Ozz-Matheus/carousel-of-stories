<?php
/*
Plugin Name: Carrusel de Historias
Description: Un carrusel interactivo estilo historias de Instagram.
Version: 1.0
Author: Orlando Montesinos Quintana
Author URI: https://orlandomontesinos.com/
*/

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Evitar acceso directo
}

// 1. Enqueue Global y Shortcode del Icono
function carrusel_historias_enqueue_assets() {
    // Carga de estilos y scripts en todo el frontend
    wp_enqueue_style( 'carrusel-historias-style', plugin_dir_url( __FILE__ ) . 'css/carrusel-historias.css', array(), '0.1.4' );
    wp_enqueue_script( 'carrusel-historias-script', plugin_dir_url( __FILE__ ) . 'js/carrusel-historias.js', array('jquery'), '0.1.4', true );

    // Consulta ultraligera para obtener solo la fecha de la última historia
    $latest_story = get_posts([
        'post_type'      => 'historia',
        'posts_per_page' => 1,
        'orderby'        => 'date',
        'order'          => 'DESC',
        'fields'         => 'ids',
    ]);

    $latest_timestamp = 0;
    if (!empty($latest_story)) {
        $latest_timestamp = get_the_time('U', $latest_story[0]);
    }

    // Pasar datos a JS (Globalmente disponible)
    wp_localize_script('carrusel-historias-script', 'CarruselGlobal', [
        'latestStoryTime' => $latest_timestamp,
        // Definimos aquí los selectores que se verán afectados
        'targetSelectors' => '.category-preview, .header-story-icon'
    ]);
}
add_action( 'wp_enqueue_scripts', 'carrusel_historias_enqueue_assets' );

// 2. Snippet para el Icono del Header (Shortcode)
function shortcode_icono_header() {

    $iconSVG = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /> </svg>';

    $tooltipText = '<span class="tooltip-text">Historias</span>';

    return '<div class="new-icons header-story-icon"><span class="icon tooltip">' . $iconSVG . $tooltipText .'</span></div>';

}
add_shortcode('icono_historia_header', 'shortcode_icono_header');

// Enqueue estilos para el área de administración
function carrusel_historias_admin_enqueue_assets() {

    wp_enqueue_media(); // Activa el uploader de medios

    wp_enqueue_style(
        'carrusel-historias-admin-style',
        plugin_dir_url( __FILE__ ) . 'css/carrusel-historias-admin.css',
        array(),
        '0.1.0'
    );

    wp_enqueue_script(
        'custom-meta-box',
        plugin_dir_url( __FILE__ ) . 'js/custom-meta-box.js',
        array('jquery'),
        null,
        true
    );
}
add_action( 'admin_enqueue_scripts', 'carrusel_historias_admin_enqueue_assets' );

// Registrar Custom Post Type para Historias
function carrusel_historias_register_cpt() {
    $labels = array(
        'name' => 'Historias',
        'singular_name' => 'Historia',
        'menu_name' => 'Historias',
        'name_admin_bar' => 'Historia',
        'add_new' => 'Añadir Nueva',
        'add_new_item' => 'Añadir Nueva Historia',
        'new_item' => 'Nueva Historia',
        'edit_item' => 'Editar Historia',
        'view_item' => 'Ver Historia',
        'all_items' => 'Todas las Historias',
        'search_items' => 'Buscar Historias',
        'not_found' => 'No se encontraron historias.',
        'not_found_in_trash' => 'No se encontraron historias en la papelera.'
    );

    $args = array(
        'labels' => $labels,
        'public' => true,
        'has_archive' => true,
        'rewrite' => array('slug' => 'historias'),
        'supports' => array('title'),
        'show_in_rest' => false, // Habilitar Gutenberg y la API REST
        'taxonomies' => array('categoria_historia'), // Usar la taxonomía personalizada
        'menu_icon' => 'dashicons-format-gallery', // Icono del menú
        'menu_position'     => 20,
    );

    register_post_type('historia', $args);
}
add_action('init', 'carrusel_historias_register_cpt');

// Registrar Taxonomía Personalizada para Categorías de Historias
function carrusel_historias_register_taxonomy() {
    $labels = array(
        'name' => 'Categorías de Historias',
        'singular_name' => 'Categoría de Historia',
        'search_items' => 'Buscar Categorías de Historias',
        'all_items' => 'Todas las Categorías de Historias',
        'parent_item' => 'Categoría Padre',
        'parent_item_colon' => 'Categoría Padre:',
        'edit_item' => 'Editar Categoría de Historia',
        'update_item' => 'Actualizar Categoría de Historia',
        'add_new_item' => 'Añadir Nueva Categoría de Historia',
        'new_item_name' => 'Nuevo Nombre de Categoría de Historia',
        'menu_name' => 'Categorías de Historias',
    );

    $args = array(
        'hierarchical' => true, // Como categorías, tener subcategorías
        'labels' => $labels,
        'show_ui' => true,
        'show_admin_column' => true,
        'query_var' => true,
        'rewrite' => array('slug' => 'categoria-historia'),
    );

    register_taxonomy('categoria_historia', array('historia'), $args);
}
add_action( 'init', 'carrusel_historias_register_taxonomy' );

// Registrar Metaboxes Personalizados para Historias
function register_historias_custom_fields() {
    add_meta_box(
        'historias_custom_fields', // ID único
        'Detalles de la Historia', // Título de la metabox
        'historias_custom_fields_html', // Función de devolución de llamada
        'historia', // Pantalla en la que aparece el cuadro
        'normal', // Contexto en donde se muestra. Opciones: 'normal', 'side', 'advanced'
        'default' // Prioridad en que la metabox aparece. Opciones: 'high', 'core', 'default', 'low'
    );
}
add_action('add_meta_boxes', 'register_historias_custom_fields');

function historias_custom_fields_html($post) {
    $media_type = get_post_meta($post->ID, 'media_type', true);
    $media_url = get_post_meta($post->ID, 'media_url', true);
    $duration = get_post_meta($post->ID, 'duration', true);
    $button_text = get_post_meta($post->ID, 'button_text', true);
    $button_link = get_post_meta($post->ID, 'button_link', true);

    ?>
    <label for="media_type">Tipo de Medio:</label>
    <select id="media_type" name="media_type" class="widefat">
        <option value="image" <?php selected($media_type, 'image'); ?>>Imagen</option>
        <option value="video" <?php selected($media_type, 'video'); ?>>Video</option>
    </select>

    <label for="media_url">URL de Imagen o Video:</label>
    <div style="display: flex; align-items: center; gap: 10px;">
        <input type="text" id="media_url" name="media_url" value="<?php echo esc_attr($media_url); ?>" class="widefat widefat_url" style="flex: 1;">
        <button type="button" class="button media_upload_button">Subir Miniatura</button>
    </div>

    <label for="duration">Duración (segundos):</label>
    <input type="number" id="duration" name="duration" value="<?php echo esc_attr($duration); ?>" class="widefat">

    <label for="button_text">Texto del Botón:</label>
    <input type="text" id="button_text" name="button_text" value="<?php echo esc_attr($button_text); ?>" class="widefat">

    <label for="button_link">URL del Botón:</label>
    <input type="text" id="button_link" name="button_link" value="<?php echo esc_attr($button_link); ?>" class="widefat">
    <?php
}

function save_historias_custom_fields($post_id) {
    if (array_key_exists('media_type', $_POST)) {
        update_post_meta($post_id, 'media_type', sanitize_text_field($_POST['media_type']));
    }

    if (array_key_exists('media_url', $_POST)) {
        update_post_meta($post_id, 'media_url', esc_url_raw($_POST['media_url']));
    }

    if (array_key_exists('duration', $_POST)) {
        update_post_meta($post_id, 'duration', intval($_POST['duration']));
    }

    if (array_key_exists('button_text', $_POST)) {
        update_post_meta($post_id, 'button_text', sanitize_text_field($_POST['button_text']));
    }

    if (array_key_exists('button_link', $_POST)) {
        update_post_meta($post_id, 'button_link', esc_url_raw($_POST['button_link']));
    }
}
add_action('save_post', 'save_historias_custom_fields');

// Shortcode para mostrar el carrusel de historias
function carrusel_historias_shortcode() {
    $args = array(
        'post_type' => 'historia',
        'posts_per_page' => -1,
        'orderby' => 'date',
        'order' => 'DESC'
    );

    $query = new WP_Query($args);
    if (!$query->have_posts()) {
        return 'No se encontraron historias.';
    }

    $categories = array();
    $items = array();

    while ($query->have_posts()) {
        $query->the_post();

        $post_timestamp = get_the_time('U');

        $post_categories = wp_get_post_terms(get_the_ID(), 'categoria_historia', array('fields' => 'all'));

        foreach ($post_categories as $category) {
            if (!isset($categories[$category->term_id])) {
                $thumbnail_url = get_term_meta($category->term_id, 'term_thumbnail', true);
                $order = get_term_meta($category->term_id, 'term_order', true);
                $categories[$category->term_id] = array(
                    'name' => $category->name,
                    'thumbnail' => $thumbnail_url,
                    'order' => $order,
                    'latest_time' => 0
                );
            }

            if ($post_timestamp > $categories[$category->term_id]['latest_time']) {
                $categories[$category->term_id]['latest_time'] = $post_timestamp;
            }

        }

        $media_type = get_post_meta(get_the_ID(), 'media_type', true);
        $media_url = get_post_meta(get_the_ID(), 'media_url', true);
        $duration = get_post_meta(get_the_ID(), 'duration', true);
        $button_text = get_post_meta(get_the_ID(), 'button_text', true);
        $button_link = get_post_meta(get_the_ID(), 'button_link', true);

        $items[] = array(
            'type' => $media_type ?: 'image',
            'url' => $media_url,
            'category' => !empty($post_categories) ? $post_categories[0]->name : '',
            'link' => $button_link,
            'button_text' => $button_text ?: 'Leer más',
            'duration' => $duration ?: 5,
        );
    }
    wp_reset_postdata();

    // Ordena las categorías por el orden especificado
    usort($categories, function($a, $b) {
        return $a['order'] <=> $b['order'];
    });

    ob_start();

    // Muestra las categorías
    echo '<div class="stories-carousel-preview">';
    foreach ($categories as $category) {
        $thumbnail = !empty($category['thumbnail']) ? esc_url($category['thumbnail']) : '';
        echo '<div class="category-box">';
        echo '<div class="category-preview" data-category="' . esc_attr($category['name']) . '" data-order="' . esc_attr($category['order']) . '" data-latest-time="' . esc_attr($category['latest_time']) . '">';
        if ($thumbnail) {
            echo '<img src="' . $thumbnail . '" alt="' . esc_attr($category['name']) . ' Icono">';
        } else {
            echo '<p>' . esc_attr($category['name']) . '</p>';
        }
        echo '</div>';
        echo '<div class="category-name">';
        echo '<p>' . esc_attr($category['name']) . '</p>';
        echo '</div>';
        echo '</div>';
    }
    echo '</div>';

    // Modal para mostrar las historias
    echo '<div id="stories-modal" class="stories-modal">';
    echo '<div class="stories-modal-content">';
    echo '<div class="story-display"></div>';
    echo '<div class="progress-bars-container"></div>';
    echo '<button class="toggle-audio audio-off"></button>';
    echo '<button class="toggle-play play-off"></button>';
    echo '<button class="close-modal"></button>';
    echo '<button class="prev-story">⟨</button>';
    echo '<button class="next-story">⟩</button>';
    echo '<div class="modal-footer"><div class="modal-footer-box-button"><a href="#" class="modal-link button" target="_blank"></a></div></div>';
    echo '</div>';
    echo '</div>';

    // Transmitir categorías e historias al frontend
    echo '<script>
    var carruselHistoriasData = {
        categories: ' . wp_json_encode($categories) . ',
        items: ' . wp_json_encode($items) . '
    };
    </script>';

    return ob_get_clean();
}
add_shortcode('carrusel_historias', 'carrusel_historias_shortcode');

function add_category_custom_fields() {
    ?>
    <div class="form-field">
        <label for="term_thumbnail">Miniatura</label>
        <div style="display: flex; align-items: center; gap: 10px;">
            <input type="text" name="term_thumbnail" id="term_thumbnail" value="" class="widefat widefat_url">
            <button type="button" class="button media_upload_button">Subir Miniatura</button>
        </div>
        <p class="description">URL de la miniatura de la categoría.</p>
    </div>
    <div class="form-field">
        <label for="term_order">Orden</label>
        <input type="number" name="term_order" id="term_order" value="" class="widefat">
        <p class="description">Orden de visualización de la categoría.</p>
    </div>
    <?php
}
add_action('categoria_historia_add_form_fields', 'add_category_custom_fields', 10, 2);

function edit_category_custom_fields($term) {
    $term_id = $term->term_id;
    $thumbnail = get_term_meta($term_id, 'term_thumbnail', true);
    $order = get_term_meta($term_id, 'term_order', true);
    ?>
    <tr class="form-field">
        <th scope="row" valign="top"><label for="term_thumbnail">Miniatura</label></th>
        <td>
            <div style="display: flex; align-items: center; gap: 10px;">
                <input type="text" name="term_thumbnail" id="term_thumbnail" value="<?php echo esc_attr($thumbnail); ?>" class="widefat widefat_url">
                <button type="button" class="button media_upload_button">Subir Miniatura</button>
            </div>
            <p class="description">URL de la miniatura de la categoría.</p>
        </td>
    </tr>
    <tr class="form-field">
        <th scope="row" valign="top"><label for="term_order">Orden</label></th>
        <td>
            <input type="number" name="term_order" id="term_order" value="<?php echo esc_attr($order); ?>" class="widefat">
            <p class="description">Orden de visualización de la categoría.</p>
        </td>
    </tr>
    <?php
}
add_action('categoria_historia_edit_form_fields', 'edit_category_custom_fields', 10, 2);

function save_category_custom_meta($term_id) {
    if (isset($_POST['term_thumbnail'])) {
        update_term_meta($term_id, 'term_thumbnail', esc_url_raw($_POST['term_thumbnail']));
    }
    if (isset($_POST['term_order'])) {
        update_term_meta($term_id, 'term_order', intval($_POST['term_order']));
    }
}
add_action('edited_categoria_historia', 'save_category_custom_meta', 10, 2);
add_action('create_categoria_historia', 'save_category_custom_meta', 10, 2);


