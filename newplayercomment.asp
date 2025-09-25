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
    
    gameid = request.querystring("g")
    targetplayerid = request.QueryString("p")
    playerid = request.QueryString("me")
    gameday = request.QueryString("d")

    mycomment = ""
    ' notebook action
    mysql = "select comment from actions where targetplayerid = " & targetplayerid & " AND valid=yes AND playerid = " & playerid & " AND actiontypeid=17 AND gameid = " & gameid
    'response.Write(mysql)
    rs.open mysql, adocon

    if not rs.eof then
	    mycomment = rs("comment").value
    end if
    rs.close
%>
<html>
<body>
<b>Previous Comment:</b><br /><xmp><%= mycomment %></xmp><br />
<form action="gamedisplay.asp?g=<%=gameid%>" method=post>
<input type=hidden name=qr_notebook value=1 />
<input type='hidden' name='target_notebook' value='<%= targetplayerid %>' />
<input type='hidden' name='gameday' value='<%=gameday %>' />
<input type='hidden' name='playerid' value='<%=playerid %>' />
<b>New Comment:</b><br />
<input name='notebook_comment' maxlength=255 style="width:500px;" /><br />
<input type=submit>
</form>
</body>
</html>