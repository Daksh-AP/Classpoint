@echo off
echo ========================================
echo   Genatis Website Deployment
echo ========================================
echo.

echo Installing Vercel CLI...
npm install -g vercel

echo.
echo Deploying to Vercel...
vercel --prod

echo.
echo ========================================
echo   Deployment Complete!
echo ========================================
echo.
echo Your website is now live!
echo Check the URL provided above.
echo.
pause