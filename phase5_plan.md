# Phase 5: Camera Capture & Scanning Station UX

**Goal**: Implement camera-based receipt capture with "scanning station" experience.

**Dependencies**: Phase 4 (Receipt Processing with Claude Vision) - VERIFIED COMPLETE

---

## Overview

Phase 5 adds a camera capture feature that complements the existing file upload functionality. The "scanning station" UX allows users to capture multiple receipts in quick succession, with automatic processing after each capture.

### Key User Flow

```
User clicks "Take Photo" → Camera opens → Live preview shown →
User captures → Image uploads → AI extracts data → User reviews →
"Add another?" prompt → Repeat or Done
```

---

## Tasks

### Task 1: Create Camera Hook (`use-camera.ts`)

**Purpose**: Encapsulate WebRTC camera access, stream management, and permission handling.

**File**: `src/hooks/use-camera.ts`

**Interface**:
```typescript
interface UseCameraOptions {
  facingMode?: 'user' | 'environment'
  onPermissionDenied?: () => void
}

interface UseCameraResult {
  videoRef: RefObject<HTMLVideoElement>
  stream: MediaStream | null
  isReady: boolean
  isLoading: boolean
  error: CameraError | null
  hasPermission: boolean | null
  startCamera: () => Promise<void>
  stopCamera: () => void
  captureImage: () => Promise<Blob | null>
  switchCamera: () => Promise<void>
}

type CameraError =
  | 'NOT_SUPPORTED'       // getUserMedia not available
  | 'PERMISSION_DENIED'   // User denied camera access
  | 'NOT_FOUND'           // No camera found
  | 'ALREADY_IN_USE'      // Camera in use by another app
  | 'UNKNOWN'             // Other errors
```

**Implementation Details**:
- Use `navigator.mediaDevices.getUserMedia()` for camera access
- Prefer rear camera (`facingMode: 'environment'`) for receipts
- Handle all permission states (prompt, granted, denied)
- Clean up stream on unmount to prevent memory leaks
- Capture to canvas and convert to Blob (JPEG, 0.9 quality)

**Acceptance Criteria**:
- [x] R3.2: Show camera preview
- [x] R3.3: Capture on user confirmation

---

### Task 2: Create Camera Preview Component (`camera-preview.tsx`)

**Purpose**: Display live camera feed with capture button and visual feedback.

**File**: `src/components/expenses/camera-preview.tsx`

**Interface**:
```typescript
interface CameraPreviewProps {
  onCapture: (blob: Blob) => void
  onClose: () => void
  disabled?: boolean
}
```

**UI Elements**:
1. **Video preview** - Full-width live camera feed
2. **Capture button** - Large circular button with visual feedback
3. **Close button** - X button to close camera
4. **Flash effect** - Brief white overlay on capture for feedback
5. **Loading state** - Spinner while camera initializes
6. **Permission prompt** - Clear instructions if permission not granted
7. **Switch camera button** - For devices with multiple cameras (mobile)

**Visual Design**:
- Dark background to make receipt stand out
- Capture button: Large (64px), primary color, with pulse animation when ready
- Flash effect: 200ms white overlay at 80% opacity
- Responsive: Works on desktop and tablet viewports

**Accessibility**:
- Keyboard accessible (Enter/Space to capture)
- ARIA labels for all buttons
- Focus trap while modal is open
- Announce camera state changes to screen readers

**Acceptance Criteria**:
- [x] R3.2: Show camera preview
- [x] R3.3: Capture on user confirmation
- [x] R16.2: Keyboard navigation support
- [x] R16.3: Appropriate ARIA labels

---

### Task 3: Create Camera Permission UI (`camera-permission.tsx`)

**Purpose**: Handle camera permission states with clear user guidance.

**File**: `src/components/expenses/camera-permission.tsx`

**States to Handle**:
1. **Requesting** - "Requesting camera access..."
2. **Denied** - Clear explanation + fallback to file upload
3. **Not Supported** - Browser doesn't support camera API
4. **Not Found** - No camera detected on device

**Interface**:
```typescript
interface CameraPermissionProps {
  error: CameraError | null
  isLoading: boolean
  onRetry: () => void
  onFallbackToUpload: () => void
}
```

**Acceptance Criteria**:
- [x] Phase 5 Task 6: Handle camera permission denial gracefully
- [x] Phase 5 Task 7: Provide fallback to file upload
- [x] R15.3: Handle failures with user-friendly messages

---

### Task 4: Create Scanning Station Modal (`scanning-station.tsx`)

**Purpose**: Full-screen modal for the receipt scanning workflow with batch capture support.

**File**: `src/components/expenses/scanning-station.tsx`

**Interface**:
```typescript
interface ScanningStationProps {
  open: boolean
  onClose: () => void
  onCaptureComplete: (receipt: CapturedReceipt) => void
}

interface CapturedReceipt {
  url: string
  thumbnailUrl: string
  extractionResult?: ReceiptExtractionResult
}
```

**Workflow States**:
1. **CAMERA_READY** - Live preview, ready to capture
2. **CAPTURING** - Brief flash effect
3. **UPLOADING** - Uploading captured image
4. **PROCESSING** - Claude Vision extracting data
5. **REVIEW** - Show extracted data, confirm or recapture
6. **PROMPT_NEXT** - "Add another receipt?" dialog

**UI Components**:
- Camera preview (full screen)
- Progress indicator during upload/processing
- Mini preview of captured image during processing
- Extraction results display with confidence indicators
- "Add Another" / "Done" buttons after successful capture
- "Retake" button if image is poor

**Acceptance Criteria**:
- [x] R3.2: Camera preview + capture
- [x] R3.4: Send to Claude Vision API
- [x] R3.5-R3.9: Extract and display with confidence
- [x] Phase 5 Task 5: "Add another?" flow

---

### Task 5: Integrate Camera with Receipt Upload Component

**Purpose**: Add camera capture option to existing `ReceiptUpload` component.

**File**: `src/components/expenses/receipt-upload.tsx` (MODIFY)

**Changes**:
1. Add "Take Photo" button alongside file upload
2. Open `ScanningStation` modal on click
3. Handle captured receipt same as uploaded file
4. Show camera icon button when no receipt
5. Maintain existing drag-and-drop and file picker

**New UI**:
```
┌─────────────────────────────────────────┐
│                                         │
│     📷          or          📁          │
│  Take Photo           Choose File       │
│                                         │
│    Drop receipt here or click above     │
│                                         │
└─────────────────────────────────────────┘
```

**Acceptance Criteria**:
- [x] Phase 5 Task 4: Integrate with existing receipt processing flow
- [x] Phase 5 Task 7: Fallback to file upload always available

---

### Task 6: Create Continuous Capture Flow

**Purpose**: Enable batch receipt scanning with automatic progression.

**Implementation in `scanning-station.tsx`**:

**After Successful Capture**:
```
┌─────────────────────────────────────────┐
│          Receipt Captured!              │
│                                         │
│    [Thumbnail]    Merchant: Starbucks   │
│                   Amount: $12.50        │
│                   Date: 2026-02-03      │
│                                         │
│    ┌──────────────┐  ┌──────────────┐   │
│    │ Add Another  │  │     Done     │   │
│    └──────────────┘  └──────────────┘   │
│                                         │
│           [Retake Photo]                │
└─────────────────────────────────────────┘
```

**Behavior**:
- "Add Another" → Reset camera, stay in modal
- "Done" → Close modal, return to expense form
- "Retake Photo" → Discard current, return to camera
- Auto-focus "Done" button for single receipt workflows
- Auto-focus "Add Another" for power users

**Acceptance Criteria**:
- [x] Phase 5 Task 5: "Add another?" or automatic progression / "Done" flow

---

### Task 7: Add Camera Utility Functions

**Purpose**: Browser detection and capability checking.

**File**: `src/lib/camera-utils.ts`

**Functions**:
```typescript
// Check if camera API is supported
function isCameraSupported(): boolean

// Check if device has camera (async)
async function hasCamera(): Promise<boolean>

// Get camera permission state
async function getCameraPermission(): Promise<PermissionState | null>

// Convert canvas to optimized Blob
function canvasToBlob(canvas: HTMLCanvasElement, quality?: number): Promise<Blob>

// Check if device is mobile (for camera switching)
function isMobileDevice(): boolean
```

**Acceptance Criteria**:
- [x] Phase 5 Task 8: Test across browsers

---

### Task 8: Write Unit Tests

**Files**:
- `src/hooks/__tests__/use-camera.test.ts`
- `src/lib/__tests__/camera-utils.test.ts`
- `src/components/expenses/__tests__/camera-preview.test.tsx`
- `src/components/expenses/__tests__/scanning-station.test.tsx`

**Test Cases**:

**use-camera.test.ts**:
- Returns error when getUserMedia not supported
- Requests camera with correct constraints
- Handles permission denied error
- Handles camera not found error
- Stops stream on cleanup
- Captures image as Blob
- Switches between cameras

**camera-utils.test.ts**:
- Detects camera support correctly
- Handles permission states
- Converts canvas to Blob with correct quality
- Detects mobile devices

**camera-preview.test.tsx**:
- Renders loading state while camera initializes
- Renders video element when ready
- Calls onCapture with Blob when button clicked
- Shows flash effect on capture
- Handles keyboard capture (Enter/Space)
- Displays permission error UI

**scanning-station.test.tsx**:
- Opens modal when open prop is true
- Shows camera preview by default
- Transitions through capture states
- Displays extraction results
- "Add Another" resets to camera
- "Done" closes modal and calls callback
- Falls back to file upload on camera error

**Acceptance Criteria**:
- [x] Design 7.2: Unit tests for components and utilities

---

### Task 9: Write Integration Tests

**File**: `src/components/expenses/__tests__/scanning-station.integration.test.tsx`

**Test Cases**:
- Full capture flow: camera → capture → upload → extract → review
- Permission denied flow: camera denied → fallback shown → file upload works
- Error handling: upload fails → retry option shown
- Error handling: extraction fails → manual entry option shown
- Multiple captures: capture → add another → capture → done

**Mocking Strategy**:
- Mock `navigator.mediaDevices.getUserMedia` with fake stream
- Mock `/api/upload` with MSW
- Mock `/api/receipts/process` with MSW
- Use `@testing-library/react` for component testing

**Acceptance Criteria**:
- [x] Design 7.3: Integration tests for user flows

---

### Task 10: Cross-Browser Testing Checklist

**Manual Testing Required**:

| Browser | Desktop | Mobile | Notes |
|---------|---------|--------|-------|
| Chrome | [ ] | [ ] | Primary target |
| Firefox | [ ] | [ ] | Different getUserMedia behavior |
| Safari | [ ] | [ ] | iOS requires HTTPS, webkit prefix |
| Edge | [ ] | [ ] | Chromium-based, should work |

**Test Scenarios**:
1. Camera permission flow (first time, denied, blocked)
2. Camera capture quality
3. Camera switching (mobile)
4. Fallback to file upload
5. Processing flow completion
6. Error states display correctly

**Safari-Specific Considerations**:
- Must use HTTPS (enforced by Vercel)
- May need `webkit` prefix for some APIs
- iOS Safari has autoplay restrictions

**Acceptance Criteria**:
- [x] Phase 5 Task 8: Test across browsers (Chrome, Firefox, Safari)

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/use-camera.ts` | WebRTC camera access hook |
| `src/lib/camera-utils.ts` | Camera utility functions |
| `src/components/expenses/camera-preview.tsx` | Live camera preview component |
| `src/components/expenses/camera-permission.tsx` | Permission state UI |
| `src/components/expenses/scanning-station.tsx` | Full scanning workflow modal |
| `src/hooks/__tests__/use-camera.test.ts` | Unit tests |
| `src/lib/__tests__/camera-utils.test.ts` | Unit tests |
| `src/components/expenses/__tests__/camera-preview.test.tsx` | Component tests |
| `src/components/expenses/__tests__/scanning-station.test.tsx` | Component tests |
| `src/components/expenses/__tests__/scanning-station.integration.test.tsx` | Integration tests |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/expenses/receipt-upload.tsx` | Add camera capture button and scanning station integration |

---

## Acceptance Criteria Mapping

### From Requirements (R3)

| Requirement | Task(s) |
|-------------|---------|
| R3.2: Camera preview, auto-detect stable/focused, capture on confirmation | Tasks 1, 2, 4 |
| R3.3: Accept image uploads as alternative | Task 5 (existing + integration) |
| R3.4: Send to Claude Vision API | Task 4 (uses existing processing) |
| R3.5-R3.9: Extract and display confidence | Task 4 (uses existing processing) |

### From Phase 5 Implementation Plan

| Task | Implementation |
|------|----------------|
| 1. Implement WebRTC camera access | Task 1 (use-camera hook) |
| 2. Create camera preview component | Task 2 (camera-preview) |
| 3. Build capture button with visual feedback | Tasks 2, 4 |
| 4. Integrate with existing receipt processing flow | Tasks 4, 5 |
| 5. Create "Add another?" / "Done" flow | Task 6 |
| 6. Handle camera permission denial gracefully | Task 3 |
| 7. Provide fallback to file upload | Tasks 3, 5 |
| 8. Test across browsers | Task 10 |

### From Design Document

| Property | Implementation |
|----------|----------------|
| P2: AI-Assisted, Human-Confirmed | Task 4 - Shows extraction results for user review |
| P4: Fail Gracefully, Retry Explicitly | Task 3 - Clear error messages with retry/fallback |
| P5: Consistent with Platform | All tasks use shadcn/ui patterns |

---

## Technical Notes

### WebRTC Constraints

```typescript
const constraints: MediaStreamConstraints = {
  video: {
    facingMode: 'environment', // Rear camera preferred
    width: { ideal: 1920 },    // High resolution for OCR
    height: { ideal: 1080 },
  },
  audio: false,
}
```

### Image Capture Quality

- Capture as JPEG with 0.9 quality for good OCR results
- Target resolution: 1920x1080 or device native
- Max file size: Same as upload (10MB)

### Security Considerations

- Camera access requires HTTPS (Vercel provides this)
- Permission is per-origin, cached by browser
- No camera data stored locally - uploaded immediately to Vercel Blob

### Performance Considerations

- Lazy load camera components (not needed on initial page load)
- Clean up MediaStream on component unmount
- Use `srcObject` for video element (not blob URL)

---

## Dependencies

### Phase 4 Verification (COMPLETE)

- [x] Receipt processing hook exists (`use-receipt-processing.ts`)
- [x] Upload API endpoint exists (`/api/upload`)
- [x] Receipt processing API exists (`/api/receipts/process`)
- [x] Confidence indicators implemented
- [x] Expense form integrates with receipt processing

### External Dependencies

- Browser `getUserMedia` API - widely supported
- No additional npm packages required (using native APIs)

---

## Estimated Component Structure

```
src/
├── hooks/
│   ├── use-camera.ts                    # NEW
│   └── __tests__/
│       └── use-camera.test.ts           # NEW
├── lib/
│   ├── camera-utils.ts                  # NEW
│   └── __tests__/
│       └── camera-utils.test.ts         # NEW
└── components/
    └── expenses/
        ├── receipt-upload.tsx           # MODIFY
        ├── camera-preview.tsx           # NEW
        ├── camera-permission.tsx        # NEW
        ├── scanning-station.tsx         # NEW
        └── __tests__/
            ├── camera-preview.test.tsx          # NEW
            ├── scanning-station.test.tsx        # NEW
            └── scanning-station.integration.test.tsx  # NEW
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Safari camera quirks | Test early on Safari, use feature detection |
| Poor image quality on some devices | Allow retake, show preview before processing |
| User confusion about permissions | Clear permission UI with fallback option |
| Camera already in use | Detect and show helpful error message |

---

## Definition of Done

- [ ] User can capture receipts via camera on desktop Chrome
- [ ] User can capture receipts via camera on mobile Safari
- [ ] Camera permission denial shows clear fallback to file upload
- [ ] Captured images process correctly through Claude Vision
- [ ] "Add another" flow enables batch receipt capture
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Manual cross-browser testing completed
- [ ] No accessibility violations (keyboard nav, screen reader)
