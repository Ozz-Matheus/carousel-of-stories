jQuery(document).ready(function ($) {
    let mediaUploader;

    $('.media_upload_button').click(function (e) {
        e.preventDefault();

        // Si ya hay un uploader, reusarlo
        if (mediaUploader) {
            mediaUploader.open();
            return;
        }

        // Crear un nuevo media uploader
        mediaUploader = wp.media({
            title: 'Seleccionar Medio',
            button: {
                text: 'Usar este medio',
            },
            multiple: false, // Permitir solo un archivo
        });

        // Callback cuando se selecciona un archivo
        mediaUploader.on('select', function () {
            const attachment = mediaUploader.state().get('selection').first().toJSON();
            $('.widefat_url').val(attachment.url);
        });

        // Abrir el uploader
        mediaUploader.open();
    });
});
