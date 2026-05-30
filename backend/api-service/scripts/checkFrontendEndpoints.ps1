$ErrorActionPreference = 'Stop'

$loginBody = @{ email='charlie.brown@student.edu'; password='Student@123!' } | ConvertTo-Json
$login = Invoke-RestMethod -Uri 'http://localhost:3001/user/login' -Method POST -ContentType 'application/json' -Body $loginBody -TimeoutSec 20
$token = $login.access
$uid = $login.user.id
$cid = '3d2585cc-522b-4819-804f-5155e902b4cc'
$headers = @{ Authorization = "Bearer $token" }

function Add-Test {
  param(
    [string]$Name,
    [string]$Method,
    [string]$Url,
    $Body = $null
  )

  [PSCustomObject]@{
    Name = $Name
    Method = $Method
    Url = $Url
    Body = $Body
  }
}

$tests = @()

# userApi
$tests += Add-Test 'user me' 'GET' 'http://localhost:3002/api/user/me'
$tests += Add-Test 'user info' 'GET' "http://localhost:3002/api/user/userinfo/$uid"
$tests += Add-Test 'user theme get' 'GET' 'http://localhost:3002/api/user/theme-index'
$tests += Add-Test 'user theme patch' 'PATCH' 'http://localhost:3002/api/user/theme-index' @{ themeIndex = 0 }
$tests += Add-Test 'user search' 'GET' 'http://localhost:3002/api/user/search-user?query=charlie&page=1&limit=5'
$tests += Add-Test 'user logout' 'POST' 'http://localhost:3002/api/user/logout' @{}
$tests += Add-Test 'user name patch' 'PATCH' 'http://localhost:3002/api/user/name' @{ name = 'Charlie Brown' }
$tests += Add-Test 'user email patch' 'PATCH' 'http://localhost:3002/api/user/email' @{ email = 'charlie.brown@student.edu' }
$tests += Add-Test 'user password patch' 'PATCH' 'http://localhost:3002/api/user/password' @{ currentPassword = 'Student@123!'; newPassword = 'Student@123!' }
$tests += Add-Test 'user block' 'POST' 'http://localhost:3002/api/user/block' @{ blockedId = $uid; conversationId = $cid }
$tests += Add-Test 'user unblock' 'DELETE' "http://localhost:3002/api/user/block/$uid" @{ conversationId = $cid }

# conversationApi + conversationKeyApi
$tests += Add-Test 'conversations list' 'GET' "http://localhost:3002/api/conversations/$uid"
$tests += Add-Test 'conversations create-group' 'POST' 'http://localhost:3002/api/conversations/create-group' @{ groupName='x'; participantIds=@($uid) }
$tests += Add-Test 'conversations search-groups' 'GET' 'http://localhost:3002/api/conversations/search-groups?query=a&page=1&limit=5'
$tests += Add-Test 'conversations chat by id' 'GET' "http://localhost:3002/api/conversations/chat/$cid?userId=$uid"
$tests += Add-Test 'conversations update request status' 'PATCH' "http://localhost:3002/api/conversations/update-message-request-status/$cid" @{ status='accepted' }
$tests += Add-Test 'conversations theme patch' 'PATCH' "http://localhost:3002/api/conversations/$cid/theme-index" @{ themeIndex = 0 }
$tests += Add-Test 'conversations delete' 'DELETE' "http://localhost:3002/api/conversations/conversation/$cid"
$tests += Add-Test 'conversations leave' 'POST' "http://localhost:3002/api/conversations/leave/$cid" @{}
$tests += Add-Test 'conversations groups requests' 'GET' 'http://localhost:3002/api/conversations/groups?page=1&limit=5'
$tests += Add-Test 'conversations request action' 'POST' 'http://localhost:3002/api/conversations/requests/test/approve' @{}
$tests += Add-Test 'conversations class requests' 'GET' 'http://localhost:3002/api/conversations/classes?page=1&limit=5'
$tests += Add-Test 'conversations pending' 'GET' 'http://localhost:3002/api/conversations/pending?page=1&limit=5'
$tests += Add-Test 'conversations unread request count' 'GET' 'http://localhost:3002/api/conversations/get-unread-request-count'
$tests += Add-Test 'conversations disappearing get' 'GET' "http://localhost:3002/api/conversations/$cid/disappearing-messages"
$tests += Add-Test 'conversations disappearing patch' 'PATCH' "http://localhost:3002/api/conversations/$cid/disappearing-messages" @{ autoDeleteMessagesAfter = 24 }
$tests += Add-Test 'conversations image patch' 'PATCH' "http://localhost:3002/api/conversations/$cid/image" @{ image='x' }
$tests += Add-Test 'conversations report' 'POST' "http://localhost:3002/api/conversations/reports/conversation/$cid" @{ reason='spam'; details='x' }
$tests += Add-Test 'conversation key exchange' 'POST' "http://localhost:3002/api/conversations/$cid/key-exchange" @{ publicKey='k' }
$tests += Add-Test 'conversation keys get' 'GET' "http://localhost:3002/api/conversations/$cid/keys"
$tests += Add-Test 'conversation participant key get' 'GET' "http://localhost:3002/api/conversations/$cid/keys/$uid"
$tests += Add-Test 'conversation key rotate' 'PUT' "http://localhost:3002/api/conversations/$cid/key-rotate" @{ newPublicKey='k2' }

# messageApi
$tests += Add-Test 'messages get list' 'GET' "http://localhost:3002/api/messages/get-messages/$cid?userId=$uid&page=1&limit=20"
$tests += Add-Test 'messages images get' 'GET' "http://localhost:3002/api/messages/$cid/images?limit=5&direction=older"
$tests += Add-Test 'messages send' 'POST' 'http://localhost:3002/api/messages/send' @{ text='x'; conversationId=$cid }
$tests += Add-Test 'messages send by conversation' 'POST' "http://localhost:3002/api/messages/send/$cid" @{ text='x' }
$tests += Add-Test 'messages send emoji' 'POST' 'http://localhost:3002/api/messages/send-emoji' @{ conversationId=$cid; emoji='smile' }
$tests += Add-Test 'messages edit' 'PUT' 'http://localhost:3002/api/messages/edit-message/test' @{ text='x' }
$tests += Add-Test 'messages delete' 'DELETE' 'http://localhost:3002/api/messages/delete/test'
$tests += Add-Test 'messages reply' 'POST' "http://localhost:3002/api/messages/$cid/reply/test" @{ text='x' }
$tests += Add-Test 'messages read' 'PUT' "http://localhost:3002/api/messages/$cid/read" @{}

# notificationApi
$tests += Add-Test 'notifications list' 'GET' 'http://localhost:3002/api/notifications?page=1&limit=10'
$tests += Add-Test 'notifications unread count' 'GET' 'http://localhost:3002/api/notifications/unread/count'
$tests += Add-Test 'notifications mark read' 'PUT' 'http://localhost:3002/api/notifications/test/read' @{}
$tests += Add-Test 'notifications read all' 'PUT' 'http://localhost:3002/api/notifications/read-all' @{}
$tests += Add-Test 'notifications delete one' 'DELETE' 'http://localhost:3002/api/notifications/test'
$tests += Add-Test 'notifications clear all' 'DELETE' 'http://localhost:3002/api/notifications/clear-all'

# reminderApi
$tests += Add-Test 'reminders create' 'POST' 'http://localhost:3002/api/reminders/' @{ conversationId=$cid; title='x'; description='x'; remindAt='2030-01-01T00:00:00.000Z' }
$tests += Add-Test 'reminders by conversation' 'GET' "http://localhost:3002/api/reminders/conversation/$cid"
$tests += Add-Test 'reminders by user' 'GET' 'http://localhost:3002/api/reminders/user'
$tests += Add-Test 'reminders upcoming' 'GET' 'http://localhost:3002/api/reminders/upcoming'
$tests += Add-Test 'reminders missed' 'GET' 'http://localhost:3002/api/reminders/missed'
$tests += Add-Test 'reminders by id get' 'GET' 'http://localhost:3002/api/reminders/test'
$tests += Add-Test 'reminders by id patch' 'PATCH' 'http://localhost:3002/api/reminders/test' @{ title='x' }
$tests += Add-Test 'reminders by id delete' 'DELETE' 'http://localhost:3002/api/reminders/test'
$tests += Add-Test 'reminders notify' 'POST' 'http://localhost:3002/api/reminders/test/notify' @{}
$tests += Add-Test 'reminders toggle' 'PATCH' 'http://localhost:3002/api/reminders/test/toggle' @{ enabled=$true }

# formApi
$tests += Add-Test 'forms my' 'GET' 'http://localhost:3002/api/forms/my'
$tests += Add-Test 'forms public' 'GET' 'http://localhost:3002/api/forms/public'
$tests += Add-Test 'forms by id get' 'GET' 'http://localhost:3002/api/forms/test'
$tests += Add-Test 'forms create' 'POST' 'http://localhost:3002/api/forms/' @{ name='x'; fields=@() }
$tests += Add-Test 'forms patch' 'PATCH' 'http://localhost:3002/api/forms/test' @{ name='x' }
$tests += Add-Test 'forms delete' 'DELETE' 'http://localhost:3002/api/forms/test'
$tests += Add-Test 'forms assignments create' 'POST' 'http://localhost:3002/api/forms/assignments' @{ conversationId=$cid; title='x' }
$tests += Add-Test 'forms assignments my' 'GET' 'http://localhost:3002/api/forms/assignments/my'
$tests += Add-Test 'forms assignments by conv' 'GET' "http://localhost:3002/api/forms/assignments?conversationId=$cid"
$tests += Add-Test 'forms assignments deactivate' 'PATCH' 'http://localhost:3002/api/forms/assignments/test/deactivate' @{}
$tests += Add-Test 'forms assignments submit' 'POST' 'http://localhost:3002/api/forms/assignments/test/submit' @{ answers=@() }
$tests += Add-Test 'forms submission get' 'GET' 'http://localhost:3002/api/forms/submissions/test'
$tests += Add-Test 'forms submission review' 'PATCH' 'http://localhost:3002/api/forms/submissions/test/review' @{ reviews=@() }

# securityApi
$tests += Add-Test 'site security create' 'POST' 'http://localhost:3002/api/site-security/create-site-security-messages' @{ conversationId=$cid; message='x' }
$tests += Add-Test 'site security get' 'GET' "http://localhost:3002/api/site-security/get-site-security-messages?conversationId=$cid"
$tests += Add-Test 'site security verify' 'POST' 'http://localhost:3002/api/site-security/verify-site-security-messages/' @{ conversationId=$cid }
$tests += Add-Test 'site security check' 'GET' 'http://localhost:3002/api/site-security/check-site-verification'

# permissionApi
$tests += Add-Test 'permissions by conversation' 'GET' "http://localhost:3002/api/permissions/conversations/$cid"
$tests += Add-Test 'permissions request' 'POST' "http://localhost:3002/api/permissions/conversations/$cid/request" @{ permissionType='message'; reason='x' }

# socialApi
$tests += Add-Test 'social posts list' 'GET' 'http://localhost:3002/api/social/posts?page=1&limit=5'
$tests += Add-Test 'social post create' 'POST' 'http://localhost:3002/api/social/posts' @{ content='x' }
$tests += Add-Test 'social post update' 'PUT' 'http://localhost:3002/api/social/posts/test' @{ content='x' }
$tests += Add-Test 'social post delete' 'DELETE' 'http://localhost:3002/api/social/posts/test'
$tests += Add-Test 'social post reaction' 'POST' 'http://localhost:3002/api/social/posts/test/reactions' @{ type='like' }
$tests += Add-Test 'social post comments' 'POST' 'http://localhost:3002/api/social/posts/test/comments' @{ content='x' }
$tests += Add-Test 'social comment replies' 'POST' 'http://localhost:3002/api/social/comments/test/replies' @{ content='x' }
$tests += Add-Test 'social upload' 'POST' 'http://localhost:3002/api/social/upload' @{}
$tests += Add-Test 'social stories create' 'POST' 'http://localhost:3002/api/social/stories' @{ content='x' }
$tests += Add-Test 'social stories my' 'GET' 'http://localhost:3002/api/social/stories/my'
$tests += Add-Test 'social profile me get' 'GET' 'http://localhost:3002/api/social/profile/me'
$tests += Add-Test 'social profile me put' 'PUT' 'http://localhost:3002/api/social/profile/me' @{ bio='x' }

# noticeApi
$tests += Add-Test 'notices list' 'GET' 'http://localhost:3002/api/notices/'
$tests += Add-Test 'notices create' 'POST' 'http://localhost:3002/api/notices/' @{ title='x'; content='x' }
$tests += Add-Test 'notices patch' 'PATCH' 'http://localhost:3002/api/notices/test' @{ title='x' }
$tests += Add-Test 'notices delete' 'DELETE' 'http://localhost:3002/api/notices/test'
$tests += Add-Test 'notices read' 'POST' 'http://localhost:3002/api/notices/test/read' @{}
$tests += Add-Test 'notices reset unread' 'POST' 'http://localhost:3002/api/notices/reset-unread' @{}
$tests += Add-Test 'notices like' 'POST' 'http://localhost:3002/api/notices/test/like' @{}

# admin APIs
$tests += Add-Test 'admin settings get' 'GET' 'http://localhost:3002/api/admin/settings'
$tests += Add-Test 'admin settings patch' 'PATCH' 'http://localhost:3002/api/admin/settings' @{ allowSignup=$true }
$tests += Add-Test 'admin dashboard stats' 'GET' 'http://localhost:3002/api/admin/dashboard/stats'
$tests += Add-Test 'admin approvals list' 'GET' 'http://localhost:3002/api/admin/approvals?page=1&limit=10'
$tests += Add-Test 'admin approval approve' 'POST' 'http://localhost:3002/api/admin/approvals/test/approve' @{}
$tests += Add-Test 'admin approval reject' 'POST' 'http://localhost:3002/api/admin/approvals/test/reject' @{}
$tests += Add-Test 'admin user management list' 'GET' 'http://localhost:3002/api/admin/user-management?page=1&limit=10'
$tests += Add-Test 'admin user management create' 'POST' 'http://localhost:3002/api/admin/user-management/create' @{ name='x'; email='x@x.com'; password='x'; role='student' }
$tests += Add-Test 'admin user management get' 'GET' 'http://localhost:3002/api/admin/user-management/test'
$tests += Add-Test 'admin user management patch' 'PATCH' 'http://localhost:3002/api/admin/user-management/test' @{ name='x' }
$tests += Add-Test 'admin user management delete' 'DELETE' 'http://localhost:3002/api/admin/user-management/test'
$tests += Add-Test 'admin user management block' 'POST' 'http://localhost:3002/api/admin/user-management/test/block' @{}
$tests += Add-Test 'admin user management unblock' 'POST' 'http://localhost:3002/api/admin/user-management/test/unblock' @{}
$tests += Add-Test 'admin user management reset-password' 'POST' 'http://localhost:3002/api/admin/user-management/test/reset-password' @{ newPassword='x' }
$tests += Add-Test 'admin user management inactive' 'GET' 'http://localhost:3002/api/admin/user-management/inactive?months=6'

# class-group and calling routes used by frontend
$tests += Add-Test 'class-group classes list' 'GET' 'http://localhost:3002/api/class-group/classes/'
$tests += Add-Test 'class-group classes search' 'GET' 'http://localhost:3002/api/class-group/classes/search?query=a&page=1&limit=10'
$tests += Add-Test 'class-group class members' 'GET' 'http://localhost:3002/api/class-group/classes/test/members'
$tests += Add-Test 'class-group attendance sessions' 'GET' 'http://localhost:3002/api/class-group/attendance/sessions?classId=test'
$tests += Add-Test 'class-group assignments class' 'GET' 'http://localhost:3002/api/class-group/assignments/class/test'
$tests += Add-Test 'class-group alertness sessions' 'GET' 'http://localhost:3002/api/class-group/alertness/class/test/sessions'

$tests += Add-Test 'calling history' 'GET' 'http://localhost:3002/calling-api/calls/history?page=1&limit=10'
$tests += Add-Test 'calling active' 'GET' 'http://localhost:3002/calling-api/calls/active'
$tests += Add-Test 'calling by id' 'GET' 'http://localhost:3002/calling-api/calls/test'

$results = foreach($t in $tests){
  try {
    if ($null -ne $t.Body) {
      $jsonBody = $t.Body | ConvertTo-Json -Depth 8
      $resp = Invoke-WebRequest -Uri $t.Url -Method $t.Method -Headers $headers -ContentType 'application/json' -Body $jsonBody -TimeoutSec 20
    } else {
      $resp = Invoke-WebRequest -Uri $t.Url -Method $t.Method -Headers $headers -TimeoutSec 20
    }

    [PSCustomObject]@{
      name = $t.Name
      method = $t.Method
      url = $t.Url
      status = [int]$resp.StatusCode
      routePresent = $true
    }
  } catch {
    $status = $null
    try { $status = [int]$_.Exception.Response.StatusCode.value__ } catch {}

    [PSCustomObject]@{
      name = $t.Name
      method = $t.Method
      url = $t.Url
      status = $status
      routePresent = ($status -ne 404 -and $status -ne 410)
    }
  }
}

$summary = [PSCustomObject]@{
  total = $results.Count
  routePresentCount = ($results | Where-Object { $_.routePresent }).Count
  missingRouteCount = ($results | Where-Object { -not $_.routePresent }).Count
}

Write-Output '=== SUMMARY ==='
$summary | ConvertTo-Json -Depth 5
Write-Output '=== MISSING OR GONE ROUTES ==='
$results | Where-Object { -not $_.routePresent } | ConvertTo-Json -Depth 5
Write-Output '=== FULL RESULTS ==='
$results | ConvertTo-Json -Depth 5
