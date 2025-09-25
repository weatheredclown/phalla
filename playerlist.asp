<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml" >
<head>
    <title>Untitled Page</title>
</head>
<body>
<%        
    gameid = Request.QueryString("game")
    If gameid = "" Then gameid = 1

    'connectionstring = "Provider=Microsoft.Jet.OLEDB.4.0; Data Source=" & Server.MapPath("phalla.mdb")
    connectionstring = "DRIVER={Microsoft Access Driver (*.mdb)};DBQ=" & Server.MapPath("phalla.mdb")

    set adoCon = Server.CreateObject("ADODB.Connection")
    adoCon.open connectionstring
    
    'Create an ADO recordset object
    set rsPhalla = Server.CreateObject("ADODB.Recordset")
  
    'Initialise the strSQL variable with an SQL statement to query the database
    strSQL = "SELECT users.username, roles.rolename FROM users INNER JOIN (roles INNER JOIN players ON roles.roleid = players.roleid) ON users.userid = players.userid WHERE players.gameid = " & gameid & ";"   

    'Open the recordset with the SQL query 
    rsPhalla.Open strSQL, adoCon
%>

<% 
'Loop through the recordset 
    Do While Not rsPhalla.EOF

        'Write the HTML to display the current record in the recordset 
        Response.Write(rsPhalla("username").Value)
        Response.Write(" ")
        Response.Write("<!-- " & rsPhalla("rolename").Value & "-->")
        Response.Write("<br>")

        'Move to the next record in the recordset 
        rsPhalla.MoveNext()
    Loop
%>
<!-- YOU SHOULD NOT BE HERE -->
<%  
    rsPhalla.Close()
    set adoCon = Nothing%>
<!--#include virtual="googletrack.inc" --> 
</body>
</html>
