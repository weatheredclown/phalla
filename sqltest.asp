<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" >
<head>
    <title>Untitled Page</title>
</head>
<body>
<%
    set adoCon = Server.CreateObject("ADODB.Connection")
    adoCon.Open("Provider=Microsoft.Jet.OLEDB.4.0; Data Source=" & Server.MapPath("phalla.mdb"))
    if request.QueryString("sql") <> "" then
        adoCon.Execute request.QueryString("sql") , 0 ,0
    end if

 %>
<form>
<input name=sql />
<input type=submit />
</form>
<!--#include virtual="googletrack.inc" --> 
</body>
</html>
