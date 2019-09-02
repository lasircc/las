
$(document).ready(function() {      
	$(".checkCategory").click(function(event) {
	event.stopPropagation();
	$(".checkCategory" + this.id).attr('checked', this.checked);
});

});

function sendMail(url){
    users=[];
    $("input[type='checkbox']:checked").each(
        function() {
            var className = $(this).attr('class');
            if (className != 'checkCategory'){
                if ($.inArray($(this).attr('username'),users)==-1)
                    users.push($(this).attr('username'));
            }
        }
    );
    console.log(users);
    return false;
}

function updateInput(){
	var subject="";
	var message="";
	if(($('#subject').val()=="") ||($('#message').val()=="")){
		alert("Insert a valid Subject / Message!");
		return false;
	}
    users=[];
    $("input[type='checkbox']:checked").each(
        function() {
            var className = $(this).attr('class');
            if (className != 'checkCategory'){
                if ($.inArray($(this).attr('username'),users)==-1)
                    users.push($(this).attr('username'));
            }
        }
    );
    if (users.length>0)
    	$('#bccRecipients').val(JSON.stringify(users));
    else{
        alert('Please insert at least one recipient!');
        return false;
   }
	return true;
}

function resetFiles(){
	$(".file").val("");
} 