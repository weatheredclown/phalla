<!-- main info - avatar, profilepic etc. -->
<% 
    strSQL = "SELECT * FROM users WHERE userid=" & vieweduserid & ";"
    'response.write(strSQL)
    RS.Open strSQL, adoCon
    if not rs.eof then 
%>
<table class="tborder" cellpadding="4" cellspacing="1" border="0" width="100%" align="center">
<tr>
	<td class="alt2">
		<table cellpadding="0" cellspacing="0" border="0" width="100%">
		<tr>
			<td style="border-right:1px solid #111111;" width="100" >			
							
				<div class="bigusername"><%=rs("username").value %></div>
				<div class="smallfont">&nbsp;</div>
			</td>
			<td style="padding-left:10px"><%= playerdescriptionblock %></td>
		</tr>
		<tr valign="top">
				<td style="border-right:1px solid #111111;" ><% if not (rs("image").value = "") then  %>
				<img src="<%= rs("image").value %>"  width="63" height="64"  alt="<%=rs("username").value %>'s Avatar" border="0" style="border:1px solid #111111; border-top:none" />
				<% end if %>
				</td>
			
			<td class="smallfont" valign="bottom" align="right">
<%
    set RS2 = Server.CreateObject("ADODB.Recordset")
    strSQL = "SELECT Max(posts.posttime) AS lastpost FROM posts where userid=" & vieweduserid & ";"
    RS2.Open strSQL, adoCon
    if not rs2.eof then
 %>
<% if rs2("lastpost").value = "" then %>
					<div>Never Active</div>
<% else %>
					<div>Last Activity: <span class="time"><%=rs2("lastpost").value %></span>&nbsp;</div>
<% end if %>
<% end if 
rs2.close
%>
<!--					<div>Viewing Thread <a href="showthread.php?t=57730" title="This is Critical Failures' Master Phalla thread.  It is for signups for running Phalla games, and discussion of game mechanics.  Keep the thread...">CF Phalla Signup List</a> @  02:42 PM&nbsp;</div>-->
				
			</td>
		</tr>
		</table>
	</td>
</tr>
<% end if %>
<!-- / main info - avatar, profilepic etc. -->
