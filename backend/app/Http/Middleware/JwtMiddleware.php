<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Tymon\JWTAuth\Facades\JWTAuth;
use Symfony\Component\HttpFoundation\Response;

class JwtMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        try {
            $user = JWTAuth::parseToken()->authenticate();

            if (!$user) {
                return response()->json(['message' => 'User not found'], 401);
            }

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Unauthorized',
                'error' => $e->getMessage()
            ], 401);
        }

        return $next($request);
    }
}
