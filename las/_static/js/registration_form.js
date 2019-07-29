function refreshCaptcha() {
    console.log("refresh captcha");
    $form = $("#captcha_form");
    $.getJSON($(this).data('url'), {'refreshCaptcha': true}, function(json) {
        console.log(json)
        $form.find("img.captcha").attr("src", json["new_cptch_image"]);
        $form.find("input[type='hidden']").val(json["new_cptch_key"]);
    });
    return false;
}

$(document).ready(function() {

    $('.js-captcha-refresh').click(refreshCaptcha);

    $('.custom-file-input').on('change',function(){
        var fileName = $(this).val().split('\\').pop();
        $(this).next('.custom-file-label').html(fileName);
    })


});



function submitRequest(){
    captcha_0 = $('#id_captcha_0').val();
    captcha_1 = $('#id_captcha_1').val();

    // validate user data and captcha form
    $.ajax({
        url:registrationUrl,
        type: "POST",
        data: { firstname: firstname,
                lastname: lastname,
                username: username,
                email1: email1,
                email2: email2,
                userType: userType,
                step:"data_check",
                project:project,
                captcha_0: captcha_0,
                captcha_1: captcha_1
        }
    }).done(function(data) {
        if (data["critical_error"]=='true'){
            alert(data["error_string"]);
            refreshCaptcha();
            return false;
        }
        else{        
            $("#confirm_button").prop('disabled', true);
            $("#id_captcha_1").prop('disabled', true);
            $("#refresh_captcha").prop('disabled', true);

            console.log("captcha successfully verified", data["regsession"]);
            
        }
    });

}

