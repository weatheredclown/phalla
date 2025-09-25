<%
    If Session("userid") = "" Then
        '        Response.Redirect("login.asp")
        Session("userid")=-1
	if request.cookies("username") <> "" then
            session("userid") = CInt(request.cookies("userid"))
            session("username") = request.cookies("username")
	end if
    End If
%>