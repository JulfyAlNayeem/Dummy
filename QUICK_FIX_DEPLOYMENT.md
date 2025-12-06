# Quick Fix - Backend & Frontend Not Running

## Issue
Backend and frontend containers are not running, causing:
- ❌ 404 errors for uploaded images
- ❌ 502 Bad Gateway for API endpoints
- ❌ WebSocket connection failures

## Quick Fix (Run these commands)

### 1. Check Environment Variables
```powershell
# Make sure .env.production exists and has correct values
Get-Content .env.production
```

### 2. Start Backend and Frontend
```powershell
# Start only backend and frontend (mongo and redis are already running)
docker-compose -f docker-compose.prod.yml up -d backend frontend
```

### 3. Check Container Status
```powershell
docker-compose -f docker-compose.prod.yml ps
```

### 4. Monitor Logs
```powershell
# Backend logs
docker logs -f dummy-backend-prod

# Frontend logs (in another terminal)
docker logs -f dummy-frontend-prod
```

## If Containers Still Won't Start

### Option A: Restart All Services
```powershell
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### Option B: Rebuild Images
```powershell
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache backend frontend
docker-compose -f docker-compose.prod.yml up -d
```

## Verify Everything Works

After starting containers, check:

1. **Backend Health**
   ```powershell
   curl http://localhost:3001/health
   ```

2. **Frontend Access**
   ```
   Open browser: http://108.181.154.241
   ```

3. **Check Browser Console**
   - Should see: "✅ Socket connected"
   - No 404 or 502 errors

## Common Issues

### Issue: Environment Variables Not Set
**Symptom**: Containers exit immediately with "DATABASE_URL not set"
**Fix**: 
```powershell
# Copy .env.production.example to .env.production
copy .env.production.example .env.production
# Edit and add your values
```

### Issue: Port Already in Use
**Symptom**: "bind: address already in use"
**Fix**:
```powershell
# Find and stop conflicting process
netstat -ano | Select-String "3001"
Stop-Process -Id <PID>
```

### Issue: Database Connection Fails
**Symptom**: "MongoServerError: Authentication failed"
**Fix**: Check DATABASE_URL in .env.production matches MONGO_USER/MONGO_PASSWORD

## Expected Output

When everything is working:
```
NAME                            STATUS
dummy-backend-prod              Up X minutes (healthy)
dummy-frontend-prod             Up X minutes
dummy-mongo                     Up X hours (healthy)
dummy-redis                     Up X hours (healthy)
dummy-backup-scheduler          Up X hours
```

## Need More Help?

Check detailed logs:
```powershell
# Last 100 lines of backend
docker logs --tail 100 dummy-backend-prod

# Follow frontend logs
docker logs -f dummy-frontend-prod
```
