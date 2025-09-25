<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" >
<head id="Head1">
    <title>Member List</title>
    <link rel="stylesheet" type="text/css" href="phalla.css" id="vbulletin_css" />
</head>
<body>
<!--#include virtual="mafia/logo.asp" --> 

<!-- content table -->
<!-- open content container -->

<div align="center">
	<div class="page" style="width:98%; text-align:left">
		<div style="padding:0px 10px 0px 10px">


	
<!-- breadcrumb, login, pm info -->

	<table class="page" cellpadding="4" cellspacing="1" border="0" width="100%" align="center">
	<tr>
		<td class="page" valign="bottom" width="100%">
			<span class="navbar"><a href="games.asp" accesskey="1">List of Games</a></span>  &raquo; <strong>
	Members List

</strong>
		</td>	
	</tr>
	</table>

<!-- / breadcrumb, login, pm info -->

<table class="tborder" cellpadding="4" cellspacing="1" border="0" width="100%" align="center">
<tr align="center">
	<td class="thead" align="left" nowrap="nowrap">User Name </td>
	
	
	
	
	
	
	<td class="thead" nowrap="nowrap">Sign-up Date </td>
	
	<td class="thead" nowrap="nowrap">Avatar</td>
	
	
	
	
	
</tr>

<%
set adoCon = Server.CreateObject("ADODB.Connection")
adoCon.Open("Provider=Microsoft.Jet.OLEDB.4.0; Data Source=" & Server.MapPath("phalla.mdb"))

set rs = Server.CreateObject("ADODB.Recordset")

strSQL = "select * from users ORDER BY username"
rs.Open strSQL, adoCon

while (not rs.eof)
%>
<tr align="center">
	<td class="alt1Active" align="left" id="u81">
		<a href="member.asp?u=<%=rs("userid").value %>"><%=rs("username").value%></a>
		<div class="smallfont"><%=rs("title").value %></div>
	</td>
	
	<td class="alt2"><%=rs("signupdate").value %></td>
	<% if rs("image").Value<>"" then %>
	<td class="alt1"><img src="<%=rs("image").value %>" border="0" alt="<%=rs("username").value %>"'s Avatar" hspace="4" vspace="4" /></td>
	<% else %>
		<td class=alt1>&nbsp;</td>
	<% end if %>
</tr>
<%
        rs.movenext()
wend

rs.close        
%>
</table>
</div></div></div>
<!-- /content table -->
<!-- /open content container -->

</body>
</html>
