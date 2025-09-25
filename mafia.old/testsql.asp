<%
   sql=request("query")
   set adoCon = Server.CreateObject("ADODB.Connection")
   adoCon.Open("Provider=Microsoft.Jet.OLEDB.4.0; Data Source=" & Server.MapPath("phalla.mdb"))
%>
<html>
<head>
<title>Test SQL</title>
</heaD>
<body>
<form action="testsql.asp">
<b>SQL:</b><br><textarea style="width:600px; height:100px;" name="query"></textarea>
<br>
<input type="submit">
</form>
<%
if sql<>"" then
%>
<font face="courier"><%=sql%>
</font>
        <table bgcolor="#DDDDDD">
        <%
        set RS = Server.CreateObject("ADODB.Recordset")
        RS.open sql, adoCon
        %><tr>
        <%
        for i = 0 to rs.fields.count - 1
        %><th align=left bgcolor="#99AADD"><%=rs.fields(i).name%></th><%
        next
        %></tr>
        <%
        while not rs.eof
        %><tr valign=top>
        <%
        for i = 0 to rs.fields.count -1
                %><td NOWRAP bgcolor=white><%= RS(i)%></td><%
        next
        %></tr>
        <%
            recCount = recCount + 1
        rs.movenext
        wend
        rs.close
        %>
</table>
Records returned: <%= recCount %><br>
<%
end if
%>

<!--#include virtual="mafia/googletrack.inc" --> 
</body>
</html>
