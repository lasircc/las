

$(document).ready(function() {
   $('#availableFeatures').hide()
    console.log(entityfeatures);

    $('#materialTable').dataTable();
    $('#tissuetypeTable').dataTable();
    $('#vectorTable').dataTable();
    $('#tissueTable').dataTable();
    $('#collectionTable').dataTable();
    $('#implantsiteTable').dataTable();
    


    $('select[name="material"]').on('change', function(){
        console.log($(this).val());
        f = $(this).val();
        $('select[name="features"]').empty();
        options = ''
        for (var i=0; i<entityfeatures.length; i++){
            if(entityfeatures[i]['abbreviation'] == f){
                for (var j=0; j<entityfeatures[i]['features'].length; j++){
                    feat = entityfeatures[i]['features'][j]
                    options += '<option value="' + feat['id'] + '">' + feat['name'] + ' ' + feat['measureUnit'] + '</option>'

                }
                break;
            }
        }
        $('select[name="features"]').append(options);
        $('#availableFeatures').show();
    })

    $('#deafultCheck').on('change', function(){
        if ($(this).prop('checked')){
            $('.optional').prop('disabled', true);
        }
        else{
            $('.optional').prop('disabled', false);
        }
        
    })


    $('.removerule').on('click', function(){
        oid = $(this).data('oid');
        liElement = $(this).parents('li')[0]
        console.log(oid);
        $.ajax({
            url:'.',
            type: "POST",
            data: {'action': 'deleterule','oid': oid}
        }).done(function(data) {
            if (data['status']){
                $(liElement).remove();
                toastr['success']('Rule deleted');
            }
            else{
                toastr['error']('Something went wrong');
            }
        });
    });
});
