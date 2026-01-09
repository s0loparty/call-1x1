## Project Goal
This project implements **1-to-1 audio calls between authenticated users** using WebRTC.
It is a private messenger feature, not a public-scale system.

The primary goals are:
- Stability
- Simplicity
- Predictable behavior
- Minimal infrastructure

## Core Constraints
- Audio only (no video)
- One-to-one calls only
- No group calls
- No call recording
- No media streaming through backend
- Web only (no native mobile apps)

## Architecture Overview

### Frontend
- Vue 3
- TypeScript
- WebRTC (`RTCPeerConnection`)
- WebSocket for signaling

Responsibilities:
- Capture microphone audio
- Create and manage RTCPeerConnection
- Handle SDP offers/answers
- Send/receive ICE candidates
- Maintain call state (idle / calling / ringing / in-call)

### Backend
- Laravel 12
- Laravel Reverb (WebSocket)
- Authenticated WebSocket connections
- Redis (optional) for pub/sub

Responsibilities:
- Authenticate users
- Route signaling messages between users
- Validate call state transitions
- Never handle audio data

### Media Transport
- WebRTC peer-to-peer
- STUN for NAT discovery
- TURN as fallback relay

## Signaling Flow (Simplified)

1. Caller sends `call:initiate`
2. Callee receives `call:incoming`
3. Callee sends `call:accept` or `call:reject`
4. Caller sends `call:offer` (SDP)
5. Callee responds with `call:answer`
6. Both sides exchange `call:ice-candidate`
7. Audio stream starts
8. Either side sends `call:end`

## Signaling Events Contract

All signaling messages must include:
- `type`
- `from_user_id`
- `to_user_id`
- `payload`

Supported event types:
- call:initiate
- call:incoming
- call:accept
- call:reject
- call:offer
- call:answer
- call:ice-candidate
- call:end

## WebRTC Rules
- Use Opus codec (default)
- Use `getUserMedia({ audio: true })`
- Always close RTCPeerConnection on call end
- Always stop media tracks after call

## ICE Configuration
- At least one public STUN server
- Own TURN server (Coturn) is strongly recommended
- TURN credentials should be time-limited

## Non-Goals
- Perfect call quality
- Massive scalability
- Telegram/Signal-level encryption
- Handling hostile network environments

## Important Notes
- Assume calls may fail due to NAT/firewall issues
- TURN traffic may be expensive
- Handle disconnects gracefully
- Keep implementation debuggable

## Development Philosophy
Prefer:
- Explicit state machines
- Clear event names
- Simple data structures
- Break down large components into smaller ones
- Avoid creating "god components"

Avoid:
- Implicit magic
- Over-abstraction
- Premature optimization
