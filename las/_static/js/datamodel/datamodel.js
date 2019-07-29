$(document).ready(function () {

    // display loaded file in the input form
    $('.custom-file-input').on('change', function () {
        let fileName = $(this).val().split('\\').pop();
        $(this).next('.custom-file-label').addClass("selected").html(fileName);
    });

    var customFilter = function (t,s) {
        var val = $.trim(t.val()).replace(/ +/g, ' ').toLowerCase();
        var $rows = s; // $(".entities-list dt");
        $rows.show().filter(function () {
            var text = $(this).text().replace(/\s+/g, ' ').toLowerCase();
            return !~text.indexOf(val); // i.e., text.indexOf(val) === -1
        }).hide();
    }


    $('#entityFilter').keyup(function() {
        customFilter($(this), $(".entities-list dt"));
    });


    $('#treeFilter').keyup(function () {
        customFilter($(this), $(".entities-list td"));
    });


});