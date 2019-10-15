$(document).ready(function () {

    // display loaded file in the input form
    $('.custom-file-input').on('change', function () {
        let fileName = $(this).val().split('\\').pop();
        $(this).next('.custom-file-label').addClass("selected").html(fileName);
    });

    // filer entities
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


    $('#treeFilter').keyup(function() {
        customFilter($(this), $(".entities-list td"));
    });

    $('#createEntity .js-typeahead').typeahead({
        display: ['slug'],
        minLength: 1,
        dynamic: true,
        searchOnFocus: true,
        mustSelectItem:true,
        emptyTemplate: 'No result for "{{query}}"',
        source: {
            schemas:{
            ajax: {
                url: "/entity/entities/schemas/",
                path: 'recordsTotal.data',
                data: {
                "q": "{{query}}",
                "prop": "slug"
                }
            }
            }
        },
        callback: {
            onSubmit: function (node, form, item, event) {
                $('#createEntity .js-typeahead').val(item['_id']);
            }
        }
    })


});