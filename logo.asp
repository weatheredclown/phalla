<!-- logo -->
<a name="top"></a>
<table border="0" width="100%" cellpadding="0" cellspacing="0" align="center" style="background-image:url(images/head_back.gif)">
<tr>
		<td align="left" valign="top" width="90%"><a href="http://www.penny-arcade.com/" style="border:none;text-decoration:none;"> <!-- <img src="images/head_left.gif" alt="Logo" border="0" /> --> &nbsp; </a></td>
		<td nowrap="nowrap" valign="top" style="padding-top:15px;padding-right:15px;">

		<div class="smallfont">
<% if not (session("username") = "") then %>
			<strong>Welcome, <a href="member.asp?u=<%= Session("userid") %>"><%= Session("username") %></a>. &nbsp; (<a href="login.asp?do=logout">Log Out</a>)</strong><br />
<!--			You last visited: Today at <span class="time">02:28 PM</span>
			<br /><a href="private.php">Private Messages</a>: Unread 0, Total 12.-->			
<% else %>
<!--#include virtual="login_form.inc" --> 
<strong><a href="login.asp?signup=y">signup</a></strong>

<% end if %>
			</div>
	
	</td>
</tr>
</table>
<!-- /logo -->

	<table width="100%" style="background-image:url(images/nav_back.gif)" align="center" border="0" cellpadding="0" cellspacing="0">
	<tr>
	<td align="left" valign="top" height="48">
		
<table width="50%"  align="left" border="0" cellspacing="0" cellpadding="0">
  <tr>
 <td align="left" valign="top" width="192" height="48"> <!-- <img src="images/nav_left.gif" width="192" height="48" border="0" alt="" /> --> </td>   		
  </tr>
</table>
    </td>
	</tr>
</table>
