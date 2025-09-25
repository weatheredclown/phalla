<%
    If Session("userid") = "" Then
        Response.Redirect("games.asp")
    End If

    userid = Session("userid")

    'Create an ADO connection object
    Dim adoCon 
    set adoCon = Server.CreateObject("ADODB.Connection")
    'Set an active connection to the Connection object using a DSN-less connection
    adoCon.Open("Provider=Microsoft.Jet.OLEDB.4.0; Data Source=" & Server.MapPath("phalla.mdb"))


    set rs = Server.CreateObject("ADODB.Recordset")
    
    postid = request.querystring("p")


    mysql = "select * from posts where postid = " & postid & ";"
    rs.open mysql, adocon

    if rs.eof then
	response.redirect("games.asp")
    end if

%>

<form action="gamedisplay.asp?g=<%=rs("gameid").value%>" method=post>
<input name="title" value='<%=replace(rs("posttitle").value,"'","&#39;")%>'><br>
<textarea rows=20 cols=80 name="message"><%if rs("rawposttext").Value="" then %><%=rs("posttext").value%><%else %><%=rs("rawposttext").value %><%end if %></textarea>
<input type=hidden name="postid" value="<%=postid%>">
<input type=hidden name="edit" value="y">
<input type=submit>
</form>

<%    
    
    rs.close
%>
