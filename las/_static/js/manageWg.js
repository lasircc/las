function inviteUser(wgID){
    var emailRe = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/igm;
    email = $('#mailText'+wgID).val();
    first_name = $('#first_name'+wgID).val();
    last_name = $('#last_name'+wgID).val();
    is_vice_pi = $('#is_vice_pi'+wgID).prop("checked");
    
    if (email == '' || !emailRe.test(email))
    {
        alert('Please enter a valid email address.');
        return false;
    }
        console.log(wgID);
    dataToSubmit = {email:email,
        wgID:wgID,
        first_name: first_name,
        last_name: last_name,
        is_vice_pi: is_vice_pi,
    }
    console.log(dataToSubmit);
    
    $.ajax({
            url:urlManageWg,
            type: "POST",
            data: dataToSubmit,
        }).done(function(data) {
            if(data["message"]=='error'){
                toastr["error"]("Error! Please retry later.");
            }
            else if (data["message"]=='ok'){
                toastr["success"]("User added!");
                t = $('#users_table-' +wgID).DataTable();
                userProfile = data['userProfile'];
                t.row.add([userProfile['username'], userProfile['email'], userProfile['first_name'], userProfile['last_name']]).draw( false );
            }
        });
    
    return;

}