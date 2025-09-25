<!-- quick reply -->
<a name="reply"></a>
<form method="post" action="<%=Request.ServerVariables("URL")%>?g=<%= gameid %>" name="vbform" id="qrform">
<table class="tborder" cellpadding="4" cellspacing="1" border="0" width="100%" align="center">
<thead>
	<tr>
		<td class="tcat" colspan="2">			
			<%= qr_title %>
		</td>
	</tr>
</thead>
<tbody id="qr_error_tbody" style="display:none">
<tr>
	<td class="thead">The following errors occurred when this message was submitted</td>
</tr>
<tr>
	<td class="alt1" id="qr_error_td"></td>
</tr>
<tr>
	<td class="tfoot" align="center"><span class="smallfont"><a href="#" onclick="return qr_hide_errors()">Okay</a></span></td>
</tr>
</tbody>
<tbody id="collapseobj_quickreply" style="">
<tr>
	<td class="panelsurround" align="center">
		<div class="panel">	
			<table cellpadding="0" cellspacing="0" border="0" align="center">
			<tr><td class="smallfont" align="left">
			    Title:<br /><input name="title"	class="bginput" style="font-size: 11px; width:500px" tabindex="1" value="<%=seededtitle%>" />

			</td></tr>
			<tr>
			
				<td class="smallfont" align="left">Message:</td>
			</tr>
			<tr>
				<td id="vB_Editor_QR" class="vBulletin_editor" align="left">
		

<div class="controlbar">
	<textarea name="message" id="vB_Editor_QR_textarea" rows="10" cols="60" style="width:700px; height:100px" tabindex="2" dir="ltr"><%=seededtext%></textarea>
	
</div>

<input type="hidden" name="wysiwyg" id="vB_Editor_QR_mode" value="0" />
<input type="hidden" name="styleid" value="0" />

	</td>
			</tr>
			<tr>
				<td align="left">
				<%				
if qr_filter = 0 then myfilter = roleid else myfilter = qr_filter
						strSQL = "select * FROM actiontypes INNER JOIN rules ON actiontypes.actiontypeid = rules.actiontypeid where roleid = " & myfilter & ";"
					    RS.Open strSQL, adoCon
					    if not rs.eof and gameactive and gameday <> 0 and (myfilter<=2 or qr_filter=0) then ' force only mafia to get a vote in this view... it's cheating
					    %>
					<fieldset class="fieldset" style="margin:3px 0px 0px 0px">
						<legend>Actions</legend>
						<div>						
						<input type="hidden" name="gameday" value=<%= gameday %> />
						<input type="hidden" name="playerid" value=<%= playerid %> />
<%
    strSQL = "SELECT users.username, players.playerid FROM users INNER JOIN players ON users.userid = players.userid where gameid=" & gameid & " and players.active=yes and users.userid <> " & userid & ";"    
    set qr_rs = Server.CreateObject("ADODB.Recordset")
    qr_rs.Open strSQL, adoCon
    thedropdown = ""
    anytargets = false
    do while not qr_rs.eof
      curusername = qr_rs("username").value
      curplayerid = qr_rs("playerid").value      
      thedropdown = thedropdown + "<option value='" & curplayerid & "'>" & curusername & "</option>"
      anytargets = true
      qr_rs.movenext()
    loop
    qr_rs.close()
    
    strSQL = "SELECT * from roles"
    qr_rs.Open strSQL, adoCon
    thedropdown2 = ""
    do while not qr_rs.eof
      currolename = qr_rs("rolename").value
      curroleid = qr_rs("roleid").value      
      thedropdown2 = thedropdown2 + "<option value='" & curroleid & "'>" & currolename & "</option>"
      qr_rs.movenext()
    loop
    qr_rs.close()
    
 %>
 						<%
              couldvote = false
                        do while not rs.eof
    						targeted = rs("targeted").value
                            actionname = rs("actionname").value
              if (not rs("private").value) and ((not targeted) or anytargets) and (actionname="vote" or qr_filter=0) then ' another hack so that desired things appear in public versus private post screen
						%>
							<label for="qr_<%=actionname %>"><input type="checkbox" name="qr_<%=actionname %>" value="1" id="qr_<%=actionname %>" accesskey="w" tabindex="4" /><%=actionname %></label>
							<%                
                       if actionname ="vote" then couldvote=true 
							if targeted then 
							   response.write("<select class='bginput' name='target_" & actionname & "'>" & thedropdown & "</select>")
              elseif actionname="claim" then
							   response.write("<select class='bginput' name='role_" & actionname & "'>" & thedropdown2 & "</select>")
							end if
							 %>
                            <br />							 
					    <%
					        end if
					        rs.movenext()
					    loop
					    rs.close

                if qr_filter=0 and couldvote then
                %>

                <label for="qr_unvote"><input type="checkbox" name="qr_unvote" value="1" id="qr_unvote"/>unvote</label>
                <br />
                <% end if %>
						</div>
					</fieldset>
				<% end if %>
				</td>
			</tr>
			</table>
		</div>	

		<div style="margin-top:4px">
      <input type="hidden" name="postsleft" value="<%=playerpostsleft%>" />
			<input type="hidden" name="fromquickreply" value="1" />
			<input type="hidden" name="qr_filter" value="<%=qr_filter%>" />
			<input type="hidden" name="do" value="postreply" />
			<input type="hidden" name="loggedinuser" value="32968" />
			<input type="submit" class="button" value="Post" accesskey="s" title="(Alt + S)" name="sbutton" tabindex="3" id="qr_submit"/>
			<!--<input type="submit" class="button" value="Go Advanced" accesskey="x" title="(Alt + X)" name="preview" tabindex="3" id="qr_preview" onclick="clickedelm = this.value" />-->
		</div>

		<div align="center" id="qr_posting_msg" style="display:none; margin-top:6px">
			<img style="vertical-align: middle;" src="/images/styles/PA/misc/progress.gif" alt="Posting Quick Reply - Please Wait" />&nbsp;<strong>Posting Quick Reply - Please Wait</strong>
		</div>	
	</td>
</tr>
</tbody>
</table>
</form>



<br />


<!-- end quick reply -->
