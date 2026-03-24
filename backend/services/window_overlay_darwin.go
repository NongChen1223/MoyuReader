//go:build darwin

package services

/*
#cgo CFLAGS: -x objective-c -fobjc-arc
#cgo LDFLAGS: -framework Cocoa

#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <stdarg.h>
#import <Cocoa/Cocoa.h>
#import <dispatch/dispatch.h>

static NSPanel *moyureaderOverlayWindow = nil;
static NSScrollView *moyureaderOverlayScrollView = nil;
static NSView *moyureaderOverlayRootView = nil;
static NSView *moyureaderOverlayHeaderView = nil;
static NSView *moyureaderOverlayResizeHandleView = nil;
static NSView *moyureaderOverlayControlsView = nil;
static NSView *moyureaderOverlayFooterView = nil;
static NSButton *moyureaderOverlayPrevButton = nil;
static NSButton *moyureaderOverlayNextButton = nil;
static NSButton *moyureaderOverlayDirectoryButton = nil;
static NSButton *moyureaderOverlayCamouflageButton = nil;
static NSButton *moyureaderOverlayCloseButton = nil;
static NSSlider *moyureaderOverlayOpacitySlider = nil;
static NSSlider *moyureaderOverlayProgressSlider = nil;
static NSTextField *moyureaderOverlayProgressLabel = nil;
static NSTextField *moyureaderOverlayOpacityLabel = nil;
static NSView *moyureaderOverlayChapterPanelView = nil;
static NSScrollView *moyureaderOverlayChapterListScrollView = nil;
static NSView *moyureaderOverlayChapterListContentView = nil;
static NSWindow *moyureaderMainAppWindow = nil;
static id moyureaderOverlayMouseDownMonitor = nil;
static BOOL moyureaderOverlayVisible = NO;
static BOOL moyureaderOverlayChromeVisible = NO;
static BOOL moyureaderOverlayControlsVisible = NO;
static BOOL moyureaderOverlayFooterVisible = NO;
static BOOL moyureaderOverlayChapterPanelVisible = NO;
static BOOL moyureaderOverlayCamouflageEnabled = NO;
static BOOL moyureaderOverlayCamouflageCollapsed = NO;
static BOOL moyureaderOverlayIsResizing = NO;
static BOOL moyureaderOverlaySuppressCamouflageCollapseUntilReenter = NO;
static NSMutableArray<NSDictionary *> *moyureaderOverlayActionQueue = nil;
static NSArray<NSString *> *moyureaderOverlayChapterTitles = nil;
static NSMutableArray<NSButton *> *moyureaderOverlayChapterButtons = nil;
static id moyureaderOverlayControlTarget = nil;
static NSString *moyureaderOverlayCurrentText = @"";
static int moyureaderOverlayCurrentFontSize = 16;
static double moyureaderOverlayCurrentLineHeight = 1.8;
static double moyureaderOverlayCurrentOpacity = 0.3;
static int moyureaderOverlayCurrentRed = 34;
static int moyureaderOverlayCurrentGreen = 34;
static int moyureaderOverlayCurrentBlue = 34;
static NSInteger moyureaderOverlayCurrentChapterIndex = 0;
static NSArray<NSNumber *> *moyureaderOverlayContentChapterIndices = nil;
static NSArray<NSValue *> *moyureaderOverlayContentChapterRanges = nil;
static double moyureaderOverlayCurrentProgress = 0.0;
static NSRect moyureaderOverlayExpandedFrame = {{0, 0}, {0, 0}};
static CGFloat moyureaderOverlayLastAttachmentResizeWidth = 0.0;
static CFTimeInterval moyureaderOverlayLastOpacityActionTimestamp = 0.0;
static double moyureaderOverlayLastOpacityActionValue = -1.0;
static CFTimeInterval moyureaderOverlayLastPositionActionTimestamp = 0.0;
static CFTimeInterval moyureaderOverlayBoundaryActionCooldownUntil = 0.0;
static NSInteger moyureaderOverlayLastPositionActionChapterIndex = -1;
static double moyureaderOverlayLastPositionActionProgress = -1.0;
static NSString *const MoyuReaderOverlayFrameWidthDefaultsKey = @"moyureader.overlay.frame.width";
static NSString *const MoyuReaderOverlayFrameHeightDefaultsKey = @"moyureader.overlay.frame.height";
static const CGFloat MoyuReaderOverlayDefaultWidth = 620.0;
static const CGFloat MoyuReaderOverlayDefaultHeight = 280.0;
static const CGFloat MoyuReaderOverlayMinWidth = 600.0;
static const CGFloat MoyuReaderOverlayMinHeight = 220.0;
static const CGFloat MoyuReaderOverlayEdgeMargin = 24.0;
static const CGFloat MoyuReaderOverlayHeaderHeight = 20.0;
static const CGFloat MoyuReaderOverlayHeaderTopInset = 8.0;
static const CGFloat MoyuReaderOverlayContentInset = 10.0;
static const CGFloat MoyuReaderOverlayBottomInset = 20.0;
static const CGFloat MoyuReaderOverlayResizeHandleVisualSize = 18.0;
static const CGFloat MoyuReaderOverlayResizeHandleHitSize = 42.0;
static const CGFloat MoyuReaderOverlayChromeRevealDistance = 14.0;
static const CGFloat MoyuReaderOverlayControlsHeight = 42.0;
static const CGFloat MoyuReaderOverlayFooterHeight = 28.0;
static const CGFloat MoyuReaderOverlayControlsGap = 8.0;
static const CGFloat MoyuReaderOverlayTopRevealHeight = 76.0;
static const CGFloat MoyuReaderOverlayBottomRevealHeight = 52.0;
static const CGFloat MoyuReaderOverlayChapterPanelWidth = 280.0;
static const CGFloat MoyuReaderOverlayChapterRowHeight = 34.0;
static const CGFloat MoyuReaderOverlayChapterRowGap = 8.0;
static const CGFloat MoyuReaderOverlayCamouflageWidth = 156.0;
static const CGFloat MoyuReaderOverlayCamouflageHeight = 96.0;
static const CFTimeInterval MoyuReaderOverlayBoundaryChapterSwitchCooldown = 0.42;
@class MoyuReaderOverlayTextView;
static void MoyuReaderHideDesktopReaderOverlayWindow(void);
static void MoyuReaderLayoutDesktopReaderOverlayViews(void);
static NSRect MoyuReaderPreferredDesktopReaderOverlayFrame(void);
static NSRect MoyuReaderClampDesktopReaderOverlayFrame(NSRect frame, NSScreen *preferredScreen);
static void MoyuReaderSetOverlayChromeVisible(BOOL visible);
static void MoyuReaderSetOverlayControlsVisible(BOOL visible);
static void MoyuReaderSetOverlayFooterVisible(BOOL visible);
static BOOL MoyuReaderShouldRevealOverlayUIAtPoint(NSPoint point, NSRect bounds);
static void MoyuReaderHandleOverlayMouseTracking(NSView *view, NSEvent *event);
static void MoyuReaderUpdateOverlayHoverStateAtPoint(NSPoint point);
static void MoyuReaderUpdateOverlayHoverStateForCurrentMouseLocation(NSWindow *window);
static void MoyuReaderPerformOverlayWindowDrag(NSWindow *window, NSEvent *event);
static void MoyuReaderUpdateDesktopReaderOverlayControls(const char *chaptersJSON, int currentChapter, double progress, double opacity, BOOL camouflageEnabled);
static char *MoyuReaderConsumeDesktopReaderOverlayActions(void);
static char *MoyuReaderGetDesktopReaderOverlayReadingLocation(void);
static void MoyuReaderMoveDesktopReaderOverlayToReadingLocation(int chapterIndex, double progress);
static void MoyuReaderSetOverlayChapterPanelVisible(BOOL visible);
static void MoyuReaderRefreshOverlayControls(void);
static void MoyuReaderRefreshOverlayProgressBar(void);
static BOOL MoyuReaderTryEnqueueOverlayBoundaryChapterAction(BOOL moveToNextChapter);
static void MoyuReaderRefreshOverlayChapterButtons(void);
static void MoyuReaderApplyOverlayChapterButtonStyles(void);
static void MoyuReaderEnqueueOverlayAction(NSString *type, NSInteger chapterIndex, double value, BOOL coalesce);
static void MoyuReaderSetOverlayCamouflageEnabled(BOOL enabled);
static void MoyuReaderSetOverlayCamouflageCollapsed(BOOL collapsed, BOOL animated);
static NSRect MoyuReaderOverlayExpandedFrameForRestore(void);
static CGFloat MoyuReaderOverlayCurrentMinimumWidth(void);
static CGFloat MoyuReaderOverlayCurrentMinimumHeight(void);
static void MoyuReaderMarkOverlayPointerReentered(void);
static BOOL MoyuReaderShouldCollapseOverlayToCamouflage(void);
static BOOL MoyuReaderOverlayWindowContainsCurrentMouseLocation(NSWindow *window);
static NSColor *MoyuReaderOverlayColor(int red, int green, int blue, double alpha);
static NSColor *MoyuReaderOverlayCurrentThemeColor(void);
static NSColor *MoyuReaderOverlayMixColor(NSColor *baseColor, NSColor *targetColor, CGFloat ratio);
static CGFloat MoyuReaderOverlayColorLuminance(NSColor *color);
static void MoyuReaderApplyDesktopReaderOverlayOpacity(double opacity);
static void MoyuReaderUpdateDesktopReaderOverlayOpacity(double opacity);
static void MoyuReaderDismissOverlayChapterPanel(void);
static BOOL MoyuReaderOverlayPointInView(NSPoint point, NSView *view);
static void MoyuReaderHandleOverlayMouseDownEvent(NSEvent *event);
static BOOL MoyuReaderOverlayStringLooksLikeHTML(NSString *string);
static NSArray<NSDictionary *> *MoyuReaderExtractOverlayChapterHTMLFragments(NSString *string);
static BOOL MoyuReaderOverlayChapterFragmentsSharePrefix(NSArray<NSDictionary *> *previousFragments, NSArray<NSDictionary *> *nextFragments);
static NSString *MoyuReaderWrapOverlayHTMLFragment(NSString *fragment);
static NSUInteger MoyuReaderCountOverlayAttachments(NSAttributedString *attributedText);
static NSImage *MoyuReaderCreateOverlayImageFromDataURL(NSString *dataURL);
static NSMutableAttributedString *MoyuReaderBuildOverlayAttributedStringFromImageFallbackHTML(NSString *string);
static NSMutableAttributedString *MoyuReaderImportOverlayHTMLAttributedString(NSString *string);
static NSMutableAttributedString *MoyuReaderCreateOverlayAttributedString(NSString *string, NSArray<NSNumber *> **chapterIndicesOut, NSArray<NSValue *> **chapterRangesOut);
static NSMutableAttributedString *MoyuReaderCreateOverlayChapterAttributedString(NSDictionary *fragment);
static BOOL MoyuReaderAppendOverlayChaptersToTextView(MoyuReaderOverlayTextView *textView, NSArray<NSDictionary *> *chapterFragments, NSInteger startIndex, int fontSize, double lineHeight, double opacity, int red, int green, int blue);
static void MoyuReaderResizeOverlayTextViewToFitContent(NSTextView *textView, NSSize viewportSize);
static NSFont *MoyuReaderOverlayTextFont(NSFont *existingFont, CGFloat pointSize);
static void MoyuReaderApplyOverlayTextAttributes(NSMutableAttributedString *attributedText, int fontSize, double lineHeight, double opacity, int red, int green, int blue);
static void MoyuReaderResizeOverlayTextAttachments(NSTextStorage *textStorage, CGFloat availableWidth);
static void MoyuReaderApplyOverlayContentAlpha(double opacity);
static NSDictionary *MoyuReaderResolveOverlayReadingLocation(void);
static BOOL MoyuReaderScrollOverlayToReadingLocation(NSInteger chapterIndex, double progress);
static BOOL MoyuReaderRefreshOverlayCurrentChapterFromVisibleLocation(void);
static void MoyuReaderNotifyOverlayReadingLocationIfNeeded(void);
static NSSize MoyuReaderOverlayPersistedSize(void);
static void MoyuReaderPersistOverlayExpandedFrameSize(NSRect frame);

static double MoyuReaderClampOverlayOpacity(double opacity) {
	return MAX(0.02, MIN(opacity, 1.0));
}

static double MoyuReaderOverlayOpacitySliderValue(double opacity) {
	return 1.02 - MoyuReaderClampOverlayOpacity(opacity);
}

static double MoyuReaderOverlayOpacityFromSliderValue(double sliderValue) {
	return MoyuReaderClampOverlayOpacity(1.02 - sliderValue);
}

static void MoyuReaderOverlayDebugLog(NSString *format, ...) {
	if (format == nil) {
		return;
	}

	va_list arguments;
	va_start(arguments, format);
	NSString *message = [[NSString alloc] initWithFormat:format arguments:arguments];
	va_end(arguments);

	NSLog(@"[MoyuReaderOverlay] %@", message);
}

@interface MoyuReaderOverlayPanel : NSPanel
@end

@implementation MoyuReaderOverlayPanel
- (BOOL)canBecomeKeyWindow {
	return YES;
}

- (BOOL)canBecomeMainWindow {
	return NO;
}

- (BOOL)acceptsFirstMouse:(NSEvent *)event {
	return YES;
}
@end

@interface MoyuReaderOverlayRootView : NSView
@property(nonatomic, strong) NSTrackingArea *trackingArea;
@end

@implementation MoyuReaderOverlayRootView
- (BOOL)isOpaque {
	return NO;
}

- (BOOL)acceptsFirstMouse:(NSEvent *)event {
	return YES;
}

- (BOOL)mouseDownCanMoveWindow {
	return YES;
}

- (void)updateTrackingAreas {
	[super updateTrackingAreas];

	if (self.trackingArea != nil) {
		[self removeTrackingArea:self.trackingArea];
	}

	self.trackingArea = [[NSTrackingArea alloc] initWithRect:NSZeroRect
	                                                 options:NSTrackingMouseMoved |
	                                                         NSTrackingMouseEnteredAndExited |
	                                                         NSTrackingActiveAlways |
	                                                         NSTrackingInVisibleRect
	                                                   owner:self
	                                                userInfo:nil];
	[self addTrackingArea:self.trackingArea];
}

- (void)layout {
	[super layout];
	MoyuReaderLayoutDesktopReaderOverlayViews();
}

- (void)mouseEntered:(NSEvent *)event {
	if (moyureaderOverlayCamouflageCollapsed) {
		return;
	}

	MoyuReaderHandleOverlayMouseTracking(self, event);
}

- (void)mouseMoved:(NSEvent *)event {
	if (moyureaderOverlayCamouflageCollapsed) {
		return;
	}

	MoyuReaderHandleOverlayMouseTracking(self, event);
}

- (void)mouseExited:(NSEvent *)event {
	if (moyureaderOverlayCamouflageCollapsed) {
		return;
	}

	if (moyureaderOverlayIsResizing) {
		return;
	}

	if (MoyuReaderShouldCollapseOverlayToCamouflage()) {
		MoyuReaderSetOverlayCamouflageCollapsed(YES, NO);
		return;
	}

	MoyuReaderSetOverlayChromeVisible(NO);
}

- (void)mouseDown:(NSEvent *)event {
	if (moyureaderOverlayCamouflageCollapsed) {
		if (event.clickCount >= 2) {
			MoyuReaderSetOverlayCamouflageCollapsed(NO, NO);
			return;
		}

		MoyuReaderPerformOverlayWindowDrag(self.window, event);
		return;
	}

	MoyuReaderPerformOverlayWindowDrag(self.window, event);
}

- (void)drawRect:(NSRect)dirtyRect {
	[super drawRect:dirtyRect];

	if (moyureaderOverlayCamouflageCollapsed) {
		NSRect bounds = NSInsetRect(self.bounds, 4.0, 4.0);
		NSColor *themeColor = MoyuReaderOverlayCurrentThemeColor();
		BOOL prefersLightCard = MoyuReaderOverlayColorLuminance(themeColor) < 0.58;
		NSColor *inkColor = prefersLightCard
			? MoyuReaderOverlayMixColor(themeColor, [NSColor blackColor], 0.18)
			: MoyuReaderOverlayMixColor(themeColor, [NSColor whiteColor], 0.12);
		NSColor *topColor = prefersLightCard
			? MoyuReaderOverlayMixColor(themeColor, [NSColor whiteColor], 0.92)
			: MoyuReaderOverlayMixColor(themeColor, [NSColor blackColor], 0.78);
		NSColor *bottomColor = prefersLightCard
			? MoyuReaderOverlayMixColor(themeColor, [NSColor whiteColor], 0.78)
			: MoyuReaderOverlayMixColor(themeColor, [NSColor blackColor], 0.62);
		NSColor *surfaceColor = prefersLightCard
			? [[NSColor whiteColor] colorWithAlphaComponent:0.80]
			: [[NSColor blackColor] colorWithAlphaComponent:0.24];
		NSColor *subtleTextColor = [inkColor colorWithAlphaComponent:(prefersLightCard ? 0.66 : 0.74)];
		NSColor *accentColor = prefersLightCard
			? MoyuReaderOverlayMixColor(themeColor, [NSColor whiteColor], 0.46)
			: MoyuReaderOverlayMixColor(themeColor, [NSColor whiteColor], 0.18);

		[[NSGraphicsContext currentContext] saveGraphicsState];

		NSShadow *shadow = [[NSShadow alloc] init];
		[shadow setShadowBlurRadius:10.0];
		[shadow setShadowOffset:NSMakeSize(0, -2)];
		[shadow setShadowColor:[[NSColor blackColor] colorWithAlphaComponent:0.18]];
		[shadow set];

		NSBezierPath *cardPath = [NSBezierPath bezierPathWithRoundedRect:bounds xRadius:18.0 yRadius:18.0];
		NSGradient *gradient = [[NSGradient alloc] initWithColors:@[
			topColor,
			bottomColor,
		]];
		[gradient drawInBezierPath:cardPath angle:160.0];
		[inkColor setStroke];
		[cardPath setLineWidth:2.4];
		[cardPath stroke];

		NSRect pinRect = NSMakeRect(NSMinX(bounds) + 14.0, NSMaxY(bounds) - 18.0, 28.0, 8.0);
		NSBezierPath *pinPath = [NSBezierPath bezierPathWithRoundedRect:pinRect xRadius:4.0 yRadius:4.0];
		[accentColor setFill];
		[pinPath fill];
		[[inkColor colorWithAlphaComponent:0.9] setStroke];
		[pinPath setLineWidth:1.6];
		[pinPath stroke];

		NSRect badgeRect = NSMakeRect(NSMaxX(bounds) - 42.0, NSMaxY(bounds) - 26.0, 28.0, 16.0);
		NSBezierPath *badgePath = [NSBezierPath bezierPathWithRoundedRect:badgeRect xRadius:8.0 yRadius:8.0];
		[surfaceColor setFill];
		[badgePath fill];
		[inkColor setStroke];
		[badgePath setLineWidth:1.8];
		[badgePath stroke];
		[@"GIF" drawInRect:NSInsetRect(badgeRect, 4.0, 1.0)
		    withAttributes:@{
			    NSFontAttributeName: [NSFont systemFontOfSize:9.0 weight:NSFontWeightBlack],
			    NSForegroundColorAttributeName: inkColor,
		    }];

		NSRect mediaRect = NSMakeRect(NSMinX(bounds) + 14.0, NSMinY(bounds) + 18.0, 42.0, 42.0);
		NSBezierPath *mediaPath = [NSBezierPath bezierPathWithRoundedRect:mediaRect xRadius:14.0 yRadius:14.0];
		[surfaceColor setFill];
		[mediaPath fill];
		[inkColor setStroke];
		[mediaPath setLineWidth:2.2];
		[mediaPath stroke];

		NSBezierPath *playPath = [NSBezierPath bezierPath];
		[playPath moveToPoint:NSMakePoint(NSMinX(mediaRect) + 15.0, NSMinY(mediaRect) + 11.0)];
		[playPath lineToPoint:NSMakePoint(NSMinX(mediaRect) + 15.0, NSMaxY(mediaRect) - 11.0)];
		[playPath lineToPoint:NSMakePoint(NSMaxX(mediaRect) - 12.0, NSMidY(mediaRect))];
		[playPath closePath];
		[accentColor setFill];
		[playPath fill];

		NSBezierPath *dotPath = [NSBezierPath bezierPathWithOvalInRect:NSMakeRect(NSMaxX(mediaRect) - 11.0, NSMaxY(mediaRect) - 11.0, 5.0, 5.0)];
		[[inkColor colorWithAlphaComponent:0.82] setFill];
		[dotPath fill];

		[@"伪装中" drawInRect:NSMakeRect(NSMinX(bounds) + 66.0, NSMinY(bounds) + 42.0, NSWidth(bounds) - 80.0, 18.0)
		     withAttributes:@{
			     NSFontAttributeName: [NSFont systemFontOfSize:14.0 weight:NSFontWeightBlack],
			     NSForegroundColorAttributeName: inkColor,
		     }];
		[@"双击展开" drawInRect:NSMakeRect(NSMinX(bounds) + 66.0, NSMinY(bounds) + 24.0, NSWidth(bounds) - 80.0, 16.0)
		      withAttributes:@{
			      NSFontAttributeName: [NSFont systemFontOfSize:10.5 weight:NSFontWeightSemibold],
			      NSForegroundColorAttributeName: subtleTextColor,
		      }];

		NSBezierPath *linePath = [NSBezierPath bezierPathWithRoundedRect:NSMakeRect(NSMinX(bounds) + 66.0, NSMinY(bounds) + 16.0, NSWidth(bounds) - 80.0, 4.0) xRadius:2.0 yRadius:2.0];
		[[accentColor colorWithAlphaComponent:0.78] setFill];
		[linePath fill];

		[[NSGraphicsContext currentContext] restoreGraphicsState];
		return;
	}

	if (!moyureaderOverlayChromeVisible) {
		return;
	}

	NSRect bounds = NSInsetRect(self.bounds, 0.8, 0.8);

	[[NSGraphicsContext currentContext] saveGraphicsState];

	NSShadow *outerShadow = [[NSShadow alloc] init];
	[outerShadow setShadowBlurRadius:10.0];
	[outerShadow setShadowOffset:NSMakeSize(0, -1)];
	[outerShadow setShadowColor:[[NSColor blackColor] colorWithAlphaComponent:0.14]];
	[outerShadow set];

	NSBezierPath *outerFrame = [NSBezierPath bezierPathWithRoundedRect:bounds xRadius:16.0 yRadius:16.0];
	[outerFrame setLineWidth:1.2];
	[[[NSColor whiteColor] colorWithAlphaComponent:0.34] setStroke];
	[outerFrame stroke];

	[[NSGraphicsContext currentContext] restoreGraphicsState];

	NSBezierPath *innerFrame = [NSBezierPath bezierPathWithRoundedRect:NSInsetRect(bounds, 1.6, 1.6) xRadius:14.0 yRadius:14.0];
	[innerFrame setLineWidth:0.8];
	[[[NSColor blackColor] colorWithAlphaComponent:0.12] setStroke];
	[innerFrame stroke];
}
@end

@interface MoyuReaderOverlayHeaderView : NSView
@end

@implementation MoyuReaderOverlayHeaderView
- (BOOL)isOpaque {
	return NO;
}

- (BOOL)acceptsFirstMouse:(NSEvent *)event {
	return YES;
}

- (BOOL)mouseDownCanMoveWindow {
	return YES;
}

- (void)mouseDown:(NSEvent *)event {
	MoyuReaderSetOverlayChromeVisible(YES);
	MoyuReaderPerformOverlayWindowDrag(self.window, event);
}

- (void)drawRect:(NSRect)dirtyRect {
	[super drawRect:dirtyRect];

	if (!moyureaderOverlayChromeVisible) {
		return;
	}

	NSRect gripRect = NSMakeRect(
		(NSWidth(self.bounds) - 72.0) / 2.0,
		(NSHeight(self.bounds) - 4.0) / 2.0,
		72.0,
		4.0
	);

	[[NSGraphicsContext currentContext] saveGraphicsState];

	NSShadow *shadow = [[NSShadow alloc] init];
	[shadow setShadowBlurRadius:6.0];
	[shadow setShadowOffset:NSMakeSize(0, -1)];
	[shadow setShadowColor:[[NSColor blackColor] colorWithAlphaComponent:0.12]];
	[shadow set];

	NSBezierPath *gripPath = [NSBezierPath bezierPathWithRoundedRect:gripRect xRadius:2.0 yRadius:2.0];
	[[[NSColor whiteColor] colorWithAlphaComponent:0.44] setFill];
	[gripPath fill];

	[[NSGraphicsContext currentContext] restoreGraphicsState];
}
@end

@interface MoyuReaderOverlayResizeHandleView : NSView
@property(nonatomic, assign) NSPoint initialMouseLocation;
@property(nonatomic, assign) NSRect initialWindowFrame;
@end

@implementation MoyuReaderOverlayResizeHandleView
- (BOOL)isOpaque {
	return NO;
}

- (BOOL)acceptsFirstMouse:(NSEvent *)event {
	return YES;
}

- (void)resetCursorRects {
	[self addCursorRect:self.bounds cursor:[NSCursor crosshairCursor]];
}

- (void)mouseDown:(NSEvent *)event {
	[super mouseDown:event];
	MoyuReaderSetOverlayChromeVisible(YES);
	moyureaderOverlayIsResizing = YES;
	if (moyureaderOverlayScrollView != nil) {
		[moyureaderOverlayScrollView setHidden:YES];
	}
	if (moyureaderOverlayChapterPanelView != nil) {
		[moyureaderOverlayChapterPanelView setHidden:YES];
	}
	self.initialMouseLocation = [NSEvent mouseLocation];
	self.initialWindowFrame = self.window.frame;
}

- (void)mouseDragged:(NSEvent *)event {
	[super mouseDragged:event];

	if (self.window == nil) {
		return;
	}

	NSPoint currentMouseLocation = [NSEvent mouseLocation];
	CGFloat deltaX = currentMouseLocation.x - self.initialMouseLocation.x;
	CGFloat deltaY = currentMouseLocation.y - self.initialMouseLocation.y;

	NSRect nextFrame = self.initialWindowFrame;
	nextFrame.size.width = MAX(MoyuReaderOverlayMinWidth, self.initialWindowFrame.size.width + deltaX);
	nextFrame.size.height = MAX(MoyuReaderOverlayMinHeight, self.initialWindowFrame.size.height - deltaY);
	nextFrame.origin.y = NSMaxY(self.initialWindowFrame) - nextFrame.size.height;
	nextFrame = MoyuReaderClampDesktopReaderOverlayFrame(nextFrame, self.window.screen ?: moyureaderMainAppWindow.screen);

	[self.window setFrame:nextFrame display:NO animate:NO];
}

- (void)mouseUp:(NSEvent *)event {
	[super mouseUp:event];
	moyureaderOverlayIsResizing = NO;
	if (moyureaderOverlayScrollView != nil) {
		[moyureaderOverlayScrollView setHidden:NO];
	}
	moyureaderOverlayExpandedFrame = self.window.frame;
	MoyuReaderPersistOverlayExpandedFrameSize(moyureaderOverlayExpandedFrame);
	moyureaderOverlayLastAttachmentResizeWidth = 0.0;
	MoyuReaderLayoutDesktopReaderOverlayViews();
	moyureaderOverlaySuppressCamouflageCollapseUntilReenter =
		!MoyuReaderOverlayWindowContainsCurrentMouseLocation(self.window);
	MoyuReaderUpdateOverlayHoverStateForCurrentMouseLocation(self.window);
}

- (void)drawRect:(NSRect)dirtyRect {
	[super drawRect:dirtyRect];

	if (!moyureaderOverlayChromeVisible) {
		return;
	}

	[[[NSColor whiteColor] colorWithAlphaComponent:0.55] setStroke];

	NSRect visualRect = NSMakeRect(
		MAX(0.0, NSWidth(self.bounds) - MoyuReaderOverlayResizeHandleVisualSize - 4.0),
		4.0,
		MIN(MoyuReaderOverlayResizeHandleVisualSize, NSWidth(self.bounds)),
		MIN(MoyuReaderOverlayResizeHandleVisualSize, NSHeight(self.bounds))
	);

	for (NSInteger index = 0; index < 3; index++) {
		CGFloat inset = 3.0 + (CGFloat)index * 4.0;
		NSBezierPath *line = [NSBezierPath bezierPath];
		[line setLineWidth:1.2];
		[line moveToPoint:NSMakePoint(NSMinX(visualRect) + inset, NSMinY(visualRect) + 2.0)];
		[line lineToPoint:NSMakePoint(NSMaxX(visualRect) - 2.0, NSMaxY(visualRect) - inset)];
		[line stroke];
	}
}
@end

@interface MoyuReaderOverlayControlTarget : NSObject
@end

@implementation MoyuReaderOverlayControlTarget
- (void)handlePrevChapter:(id)sender {
	MoyuReaderEnqueueOverlayAction(@"prev", -1, NAN, NO);
}

- (void)handleNextChapter:(id)sender {
	MoyuReaderEnqueueOverlayAction(@"next", -1, NAN, NO);
}

- (void)handleToggleDirectory:(id)sender {
	MoyuReaderSetOverlayChapterPanelVisible(!moyureaderOverlayChapterPanelVisible);
}

- (void)handleToggleCamouflage:(id)sender {
	BOOL nextEnabled = !moyureaderOverlayCamouflageEnabled;
	MoyuReaderSetOverlayCamouflageEnabled(nextEnabled);
	MoyuReaderEnqueueOverlayAction(@"camouflage", -1, nextEnabled ? 1.0 : 0.0, YES);
}

- (void)handleCloseOverlay:(id)sender {
	MoyuReaderEnqueueOverlayAction(@"close", -1, NAN, NO);
	MoyuReaderHideDesktopReaderOverlayWindow();
}

- (void)handleOpacityChanged:(NSSlider *)sender {
	moyureaderOverlayCurrentOpacity = MoyuReaderOverlayOpacityFromSliderValue(sender.doubleValue);
	MoyuReaderApplyDesktopReaderOverlayOpacity(moyureaderOverlayCurrentOpacity);

	CFTimeInterval now = CFAbsoluteTimeGetCurrent();
	BOOL shouldEnqueueAction =
		moyureaderOverlayLastOpacityActionTimestamp <= 0.0 ||
		fabs(moyureaderOverlayLastOpacityActionValue - moyureaderOverlayCurrentOpacity) >= 0.012 ||
		(now - moyureaderOverlayLastOpacityActionTimestamp) >= (1.0 / 30.0);
	if (shouldEnqueueAction) {
		moyureaderOverlayLastOpacityActionTimestamp = now;
		moyureaderOverlayLastOpacityActionValue = moyureaderOverlayCurrentOpacity;
		MoyuReaderEnqueueOverlayAction(@"opacity", -1, moyureaderOverlayCurrentOpacity, YES);
	}
}

- (void)handleProgressChanged:(NSSlider *)sender {
	double nextProgress = MAX(0.0, MIN(sender.doubleValue, 100.0));
	moyureaderOverlayCurrentProgress = nextProgress;
	MoyuReaderRefreshOverlayControls();
	MoyuReaderMoveDesktopReaderOverlayToReadingLocation(
		(int)moyureaderOverlayCurrentChapterIndex,
		nextProgress / 100.0
	);
}

- (void)handleSelectChapter:(NSButton *)sender {
	MoyuReaderSetOverlayChapterPanelVisible(NO);
	MoyuReaderEnqueueOverlayAction(@"chapter", sender.tag, NAN, NO);
}
@end

@interface MoyuReaderOverlayScrollView : NSScrollView
@property(nonatomic, strong) NSTrackingArea *trackingArea;
@end

@implementation MoyuReaderOverlayScrollView
- (BOOL)acceptsFirstResponder {
	return YES;
}

- (BOOL)acceptsFirstMouse:(NSEvent *)event {
	return YES;
}

- (void)updateTrackingAreas {
	[super updateTrackingAreas];

	if (self.trackingArea != nil) {
		[self removeTrackingArea:self.trackingArea];
	}

	self.trackingArea = [[NSTrackingArea alloc] initWithRect:NSZeroRect
	                                                 options:NSTrackingMouseMoved |
	                                                         NSTrackingMouseEnteredAndExited |
	                                                         NSTrackingActiveAlways |
	                                                         NSTrackingInVisibleRect
	                                                   owner:self
	                                                userInfo:nil];
	[self addTrackingArea:self.trackingArea];
}

- (void)mouseEntered:(NSEvent *)event {
	MoyuReaderHandleOverlayMouseTracking(self, event);
}

- (void)mouseMoved:(NSEvent *)event {
	MoyuReaderHandleOverlayMouseTracking(self, event);
}

- (void)mouseExited:(NSEvent *)event {
	if (moyureaderOverlayIsResizing) {
		return;
	}

	MoyuReaderUpdateOverlayHoverStateForCurrentMouseLocation(self.window);
}

- (void)scrollWheel:(NSEvent *)event {
	if (self.window != nil) {
		[self.window orderFrontRegardless];
	}

	[super scrollWheel:event];
}

- (void)reflectScrolledClipView:(NSClipView *)clipView {
	[super reflectScrolledClipView:clipView];
	MoyuReaderNotifyOverlayReadingLocationIfNeeded();
}
@end

@interface MoyuReaderOverlayChapterListScrollView : NSScrollView
@property(nonatomic, strong) NSTrackingArea *trackingArea;
@end

@implementation MoyuReaderOverlayChapterListScrollView
- (BOOL)acceptsFirstResponder {
	return YES;
}

- (BOOL)acceptsFirstMouse:(NSEvent *)event {
	return YES;
}

- (void)updateTrackingAreas {
	[super updateTrackingAreas];

	if (self.trackingArea != nil) {
		[self removeTrackingArea:self.trackingArea];
	}

	self.trackingArea = [[NSTrackingArea alloc] initWithRect:NSZeroRect
	                                                 options:NSTrackingMouseMoved |
	                                                         NSTrackingMouseEnteredAndExited |
	                                                         NSTrackingActiveAlways |
	                                                         NSTrackingInVisibleRect
	                                                   owner:self
	                                                userInfo:nil];
	[self addTrackingArea:self.trackingArea];
}

- (void)mouseEntered:(NSEvent *)event {
	MoyuReaderHandleOverlayMouseTracking(self, event);
}

- (void)mouseMoved:(NSEvent *)event {
	MoyuReaderHandleOverlayMouseTracking(self, event);
}

- (void)mouseExited:(NSEvent *)event {
	MoyuReaderHandleOverlayMouseTracking(self, event);
}

- (void)scrollWheel:(NSEvent *)event {
	if (self.window != nil) {
		[self.window orderFrontRegardless];
	}

	NSClipView *contentView = self.contentView;
	NSView *documentView = self.documentView;
	CGFloat offsetBefore = contentView != nil ? contentView.bounds.origin.y : 0.0;
	CGFloat viewportHeightBefore = contentView != nil ? NSHeight(contentView.bounds) : 0.0;
	CGFloat contentHeightBefore = documentView != nil ? NSHeight(documentView.frame) : 0.0;
	CGFloat maxOffsetBefore = MAX(0.0, contentHeightBefore - viewportHeightBefore);
	BOOL wasAtBottom = offsetBefore >= maxOffsetBefore - 2.0;
	BOOL wasAtTop = offsetBefore <= 2.0;

	[super scrollWheel:event];

	if (contentView == nil || documentView == nil) {
		return;
	}

	CGFloat offsetAfter = contentView.bounds.origin.y;
	BOOL scrollPositionChanged = fabs(offsetAfter - offsetBefore) >= 0.5;

	if (!scrollPositionChanged && wasAtBottom) {
		if (MoyuReaderTryEnqueueOverlayBoundaryChapterAction(YES)) {
			return;
		}
	}

	if (!scrollPositionChanged && wasAtTop) {
		MoyuReaderTryEnqueueOverlayBoundaryChapterAction(NO);
	}
}
@end

@interface MoyuReaderOverlayChapterPanelView : NSView
@end

@implementation MoyuReaderOverlayChapterPanelView
- (BOOL)isOpaque {
	return NO;
}

- (BOOL)acceptsFirstMouse:(NSEvent *)event {
	return YES;
}

- (void)scrollWheel:(NSEvent *)event {
	if (moyureaderOverlayChapterListScrollView != nil) {
		[moyureaderOverlayChapterListScrollView scrollWheel:event];
		return;
	}

	[super scrollWheel:event];
}
@end

@interface MoyuReaderOverlayFlippedView : NSView
@end

@implementation MoyuReaderOverlayFlippedView
- (BOOL)isFlipped {
	return YES;
}
@end

@interface MoyuReaderOverlayTextView : NSTextView
@property(nonatomic, strong) NSTrackingArea *trackingArea;
@end

@implementation MoyuReaderOverlayTextView
- (BOOL)acceptsFirstResponder {
	return YES;
}

- (BOOL)acceptsFirstMouse:(NSEvent *)event {
	return YES;
}

- (BOOL)mouseDownCanMoveWindow {
	return YES;
}

- (void)updateTrackingAreas {
	[super updateTrackingAreas];

	if (self.trackingArea != nil) {
		[self removeTrackingArea:self.trackingArea];
	}

	self.trackingArea = [[NSTrackingArea alloc] initWithRect:NSZeroRect
	                                                 options:NSTrackingMouseMoved |
	                                                         NSTrackingMouseEnteredAndExited |
	                                                         NSTrackingActiveAlways |
	                                                         NSTrackingInVisibleRect
	                                                   owner:self
	                                                userInfo:nil];
	[self addTrackingArea:self.trackingArea];
}

- (void)mouseEntered:(NSEvent *)event {
	MoyuReaderHandleOverlayMouseTracking(self, event);
}

- (void)mouseMoved:(NSEvent *)event {
	MoyuReaderHandleOverlayMouseTracking(self, event);
}

- (void)mouseExited:(NSEvent *)event {
	if (moyureaderOverlayIsResizing) {
		return;
	}

	MoyuReaderUpdateOverlayHoverStateForCurrentMouseLocation(self.window);
}

- (void)keyDown:(NSEvent *)event {
	if (event.keyCode == 53) {
		MoyuReaderEnqueueOverlayAction(@"close", -1, NAN, NO);
		MoyuReaderHideDesktopReaderOverlayWindow();
		return;
	}

	[super keyDown:event];
}

- (void)mouseDown:(NSEvent *)event {
	if (event.clickCount >= 2) {
		MoyuReaderEnqueueOverlayAction(@"close", -1, NAN, NO);
		MoyuReaderHideDesktopReaderOverlayWindow();
		return;
	}

	MoyuReaderPerformOverlayWindowDrag(self.window, event);
}

- (void)scrollWheel:(NSEvent *)event {
	if (self.enclosingScrollView != nil) {
		[self.enclosingScrollView scrollWheel:event];
		return;
	}

	[super scrollWheel:event];
}
@end

static void MoyuReaderPerformSyncOnMainQueue(dispatch_block_t block) {
	if (block == nil) {
		return;
	}

	if ([NSThread isMainThread]) {
		block();
		return;
	}

	dispatch_sync(dispatch_get_main_queue(), block);
}

static NSTextField *MoyuReaderCreateOverlayLabel(NSString *text) {
	NSTextField *label = [NSTextField labelWithString:text ?: @""];
	[label setTextColor:[[NSColor whiteColor] colorWithAlphaComponent:0.84]];
	[label setFont:[NSFont systemFontOfSize:11.0 weight:NSFontWeightSemibold]];
	[label setBackgroundColor:[NSColor clearColor]];
	[label setBezeled:NO];
	[label setDrawsBackground:NO];
	[label setSelectable:NO];
	[label setEditable:NO];
	[label setLineBreakMode:NSLineBreakByTruncatingTail];
	return label;
}

static void MoyuReaderSetOverlayButtonTitle(NSButton *button, NSString *title, NSColor *color, NSFont *font) {
	if (button == nil) {
		return;
	}

	NSString *safeTitle = title ?: @"";
	NSMutableParagraphStyle *paragraphStyle = [[NSMutableParagraphStyle alloc] init];
	[paragraphStyle setAlignment:button.alignment];
	[paragraphStyle setLineBreakMode:NSLineBreakByTruncatingTail];
	if (button.alignment == NSTextAlignmentLeft) {
		[paragraphStyle setFirstLineHeadIndent:12.0];
		[paragraphStyle setHeadIndent:12.0];
		[paragraphStyle setTailIndent:-12.0];
	}
	NSDictionary *attributes = @{
		NSForegroundColorAttributeName: color ?: [[NSColor whiteColor] colorWithAlphaComponent:0.92],
		NSFontAttributeName: font ?: [NSFont systemFontOfSize:12.0 weight:NSFontWeightSemibold],
		NSParagraphStyleAttributeName: paragraphStyle,
	};
	[button setTitle:safeTitle];
	[button setAttributedTitle:[[NSAttributedString alloc] initWithString:safeTitle attributes:attributes]];
	if ([button.cell isKindOfClass:[NSButtonCell class]]) {
		NSButtonCell *cell = (NSButtonCell *)button.cell;
		[cell setLineBreakMode:NSLineBreakByTruncatingTail];
		[cell setWraps:NO];
		[cell setScrollable:NO];
	}
}

static NSButton *MoyuReaderCreateOverlayActionButton(NSString *title, SEL action) {
	NSButton *button = [NSButton buttonWithTitle:title ?: @""
	                                      target:moyureaderOverlayControlTarget
	                                      action:action];
	[button setBordered:NO];
	[button setBezelStyle:NSBezelStyleRegularSquare];
	[button setWantsLayer:YES];
	button.layer.cornerRadius = 8.0;
	button.layer.borderWidth = 1.0;
	button.layer.borderColor = [[NSColor whiteColor] colorWithAlphaComponent:0.16].CGColor;
	button.layer.backgroundColor = [[NSColor blackColor] colorWithAlphaComponent:0.16].CGColor;
	MoyuReaderSetOverlayButtonTitle(button, title, [[NSColor whiteColor] colorWithAlphaComponent:0.92], [NSFont systemFontOfSize:12.0 weight:NSFontWeightSemibold]);
	return button;
}

static NSButton *MoyuReaderCreateOverlayChapterButton(NSString *title, NSInteger index) {
	NSButton *button = [NSButton buttonWithTitle:title ?: @""
	                                      target:moyureaderOverlayControlTarget
	                                      action:@selector(handleSelectChapter:)];
	[button setTag:index];
	[button setBordered:NO];
	[button setButtonType:NSButtonTypeMomentaryPushIn];
	[button setBezelStyle:NSBezelStyleRegularSquare];
	[button setAlignment:NSTextAlignmentLeft];
	[button setWantsLayer:YES];
	button.layer.cornerRadius = 8.0;
	button.layer.masksToBounds = YES;
	button.layer.borderWidth = 1.0;
	button.layer.borderColor = [[NSColor whiteColor] colorWithAlphaComponent:0.10].CGColor;
	button.layer.backgroundColor = [NSColor colorWithCalibratedWhite:0.15 alpha:0.98].CGColor;
	[button setToolTip:title ?: @""];
	MoyuReaderSetOverlayButtonTitle(button, title, [[NSColor whiteColor] colorWithAlphaComponent:0.94], [NSFont systemFontOfSize:12.0 weight:NSFontWeightMedium]);
	return button;
}

static void MoyuReaderEnqueueOverlayAction(NSString *type, NSInteger chapterIndex, double value, BOOL coalesce) {
	if (type == nil || type.length == 0) {
		return;
	}

	if (moyureaderOverlayActionQueue == nil) {
		moyureaderOverlayActionQueue = [[NSMutableArray alloc] init];
	}

	NSMutableDictionary *payload = [NSMutableDictionary dictionaryWithObject:type forKey:@"type"];
	if (chapterIndex >= 0) {
		payload[@"chapterIndex"] = @(chapterIndex);
	}
	if (!isnan(value)) {
		payload[@"value"] = @(value);
	}

	if (coalesce) {
		for (NSInteger index = moyureaderOverlayActionQueue.count - 1; index >= 0; index--) {
			NSDictionary *existing = moyureaderOverlayActionQueue[index];
			if ([existing[@"type"] isEqualToString:type]) {
				moyureaderOverlayActionQueue[index] = payload;
				return;
			}
		}
	}

	[moyureaderOverlayActionQueue addObject:payload];
}

static CGFloat MoyuReaderOverlayCurrentMinimumWidth(void) {
	return moyureaderOverlayCamouflageCollapsed ? MoyuReaderOverlayCamouflageWidth : MoyuReaderOverlayMinWidth;
}

static CGFloat MoyuReaderOverlayCurrentMinimumHeight(void) {
	return moyureaderOverlayCamouflageCollapsed ? MoyuReaderOverlayCamouflageHeight : MoyuReaderOverlayMinHeight;
}

static void MoyuReaderMarkOverlayPointerReentered(void) {
	if (moyureaderOverlayCamouflageCollapsed || moyureaderOverlayIsResizing) {
		return;
	}

	moyureaderOverlaySuppressCamouflageCollapseUntilReenter = NO;
}

static BOOL MoyuReaderShouldCollapseOverlayToCamouflage(void) {
	return moyureaderOverlayCamouflageEnabled &&
		moyureaderOverlayVisible &&
		!moyureaderOverlayCamouflageCollapsed &&
		!moyureaderOverlayIsResizing &&
		!moyureaderOverlaySuppressCamouflageCollapseUntilReenter;
}

static BOOL MoyuReaderOverlayWindowContainsCurrentMouseLocation(NSWindow *window) {
	if (window == nil || moyureaderOverlayRootView == nil) {
		return NO;
	}

	NSPoint point = [moyureaderOverlayRootView convertPoint:[window mouseLocationOutsideOfEventStream] fromView:nil];
	return NSPointInRect(point, moyureaderOverlayRootView.bounds);
}

static NSColor *MoyuReaderOverlayCurrentThemeColor(void) {
	NSColor *themeColor = MoyuReaderOverlayColor(
		moyureaderOverlayCurrentRed,
		moyureaderOverlayCurrentGreen,
		moyureaderOverlayCurrentBlue,
		1.0
	);
	return [themeColor colorUsingColorSpace:[NSColorSpace sRGBColorSpace]] ?: [NSColor colorWithCalibratedWhite:0.22 alpha:1.0];
}

static NSColor *MoyuReaderOverlayMixColor(NSColor *baseColor, NSColor *targetColor, CGFloat ratio) {
	NSColor *resolvedBase = [baseColor colorUsingColorSpace:[NSColorSpace sRGBColorSpace]] ?: [NSColor colorWithCalibratedWhite:0.22 alpha:1.0];
	NSColor *resolvedTarget = [targetColor colorUsingColorSpace:[NSColorSpace sRGBColorSpace]] ?: [NSColor whiteColor];
	CGFloat clampedRatio = MAX(0.0, MIN(ratio, 1.0));
	CGFloat baseRatio = 1.0 - clampedRatio;

	return [NSColor colorWithCalibratedRed:(resolvedBase.redComponent * baseRatio) + (resolvedTarget.redComponent * clampedRatio)
	                                 green:(resolvedBase.greenComponent * baseRatio) + (resolvedTarget.greenComponent * clampedRatio)
	                                  blue:(resolvedBase.blueComponent * baseRatio) + (resolvedTarget.blueComponent * clampedRatio)
	                                 alpha:1.0];
}

static CGFloat MoyuReaderOverlayColorLuminance(NSColor *color) {
	NSColor *resolvedColor = [color colorUsingColorSpace:[NSColorSpace sRGBColorSpace]] ?: [NSColor colorWithCalibratedWhite:0.22 alpha:1.0];
	return (resolvedColor.redComponent * 0.299) + (resolvedColor.greenComponent * 0.587) + (resolvedColor.blueComponent * 0.114);
}

static NSRect MoyuReaderOverlayExpandedFrameForRestore(void) {
	NSRect baseFrame = moyureaderOverlayExpandedFrame;
	if (NSIsEmptyRect(baseFrame) || baseFrame.size.width < MoyuReaderOverlayMinWidth || baseFrame.size.height < MoyuReaderOverlayMinHeight) {
		baseFrame = MoyuReaderPreferredDesktopReaderOverlayFrame();
	}

	if (moyureaderOverlayWindow == nil || !moyureaderOverlayCamouflageCollapsed) {
		return MoyuReaderClampDesktopReaderOverlayFrame(
			baseFrame,
			moyureaderOverlayWindow != nil ? (moyureaderOverlayWindow.screen ?: moyureaderMainAppWindow.screen) : moyureaderMainAppWindow.screen
		);
	}

	NSRect collapsedFrame = moyureaderOverlayWindow.frame;
	baseFrame.origin.x = NSMidX(collapsedFrame) - (baseFrame.size.width / 2.0);
	baseFrame.origin.y = NSMidY(collapsedFrame) - (baseFrame.size.height / 2.0);
	return MoyuReaderClampDesktopReaderOverlayFrame(baseFrame, moyureaderOverlayWindow.screen ?: moyureaderMainAppWindow.screen);
}

static NSSize MoyuReaderOverlayPersistedSize(void) {
	NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
	double width = [defaults doubleForKey:MoyuReaderOverlayFrameWidthDefaultsKey];
	double height = [defaults doubleForKey:MoyuReaderOverlayFrameHeightDefaultsKey];

	if (width < MoyuReaderOverlayMinWidth || height < MoyuReaderOverlayMinHeight) {
		return NSMakeSize(MoyuReaderOverlayDefaultWidth, MoyuReaderOverlayDefaultHeight);
	}

	return NSMakeSize(width, height);
}

static void MoyuReaderPersistOverlayExpandedFrameSize(NSRect frame) {
	if (frame.size.width < MoyuReaderOverlayMinWidth || frame.size.height < MoyuReaderOverlayMinHeight) {
		return;
	}

	NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
	[defaults setDouble:frame.size.width forKey:MoyuReaderOverlayFrameWidthDefaultsKey];
	[defaults setDouble:frame.size.height forKey:MoyuReaderOverlayFrameHeightDefaultsKey];
}

static void MoyuReaderSetOverlayCamouflageCollapsed(BOOL collapsed, BOOL animated) {
	if (moyureaderOverlayWindow == nil || !moyureaderOverlayVisible) {
		moyureaderOverlayCamouflageCollapsed = NO;
		return;
	}

	if (collapsed) {
		if (moyureaderOverlayCamouflageCollapsed) {
			return;
		}

		moyureaderOverlayExpandedFrame = moyureaderOverlayWindow.frame;
		moyureaderOverlayCamouflageCollapsed = YES;
		moyureaderOverlayIsResizing = NO;
		moyureaderOverlaySuppressCamouflageCollapseUntilReenter = NO;
		MoyuReaderSetOverlayChapterPanelVisible(NO);
		[moyureaderOverlayWindow setMinSize:NSMakeSize(MoyuReaderOverlayCamouflageWidth, MoyuReaderOverlayCamouflageHeight)];
		[moyureaderOverlayScrollView setHidden:YES];

		NSRect collapsedFrame = NSMakeRect(
			NSMidX(moyureaderOverlayExpandedFrame) - (MoyuReaderOverlayCamouflageWidth / 2.0),
			NSMidY(moyureaderOverlayExpandedFrame) - (MoyuReaderOverlayCamouflageHeight / 2.0),
			MoyuReaderOverlayCamouflageWidth,
			MoyuReaderOverlayCamouflageHeight
		);
		collapsedFrame = MoyuReaderClampDesktopReaderOverlayFrame(
			collapsedFrame,
			moyureaderOverlayWindow.screen ?: moyureaderMainAppWindow.screen
		);

		[moyureaderOverlayWindow setFrame:collapsedFrame display:YES animate:animated];
		MoyuReaderSetOverlayChromeVisible(NO);
		[moyureaderOverlayRootView setNeedsDisplay:YES];
		return;
	}

	if (!moyureaderOverlayCamouflageCollapsed) {
		return;
	}

	NSRect expandedFrame = MoyuReaderOverlayExpandedFrameForRestore();
	moyureaderOverlayExpandedFrame = expandedFrame;
	moyureaderOverlayCamouflageCollapsed = NO;
	moyureaderOverlayIsResizing = NO;
	moyureaderOverlaySuppressCamouflageCollapseUntilReenter = NO;
	[moyureaderOverlayWindow setMinSize:NSMakeSize(MoyuReaderOverlayMinWidth, MoyuReaderOverlayMinHeight)];
	[moyureaderOverlayScrollView setHidden:NO];
	[moyureaderOverlayWindow setFrame:expandedFrame display:YES animate:animated];
	MoyuReaderLayoutDesktopReaderOverlayViews();
	MoyuReaderUpdateOverlayHoverStateForCurrentMouseLocation(moyureaderOverlayWindow);
}

static void MoyuReaderSetOverlayCamouflageEnabled(BOOL enabled) {
	moyureaderOverlayCamouflageEnabled = enabled;
	if (!enabled) {
		MoyuReaderSetOverlayCamouflageCollapsed(NO, NO);
	}

	MoyuReaderRefreshOverlayControls();
	if (moyureaderOverlayRootView != nil) {
		[moyureaderOverlayRootView setNeedsDisplay:YES];
	}
}

static void MoyuReaderRefreshOverlayControls(void) {
	if (moyureaderOverlayPrevButton == nil || moyureaderOverlayNextButton == nil ||
	    moyureaderOverlayDirectoryButton == nil || moyureaderOverlayCamouflageButton == nil ||
	    moyureaderOverlayOpacitySlider == nil || moyureaderOverlayProgressSlider == nil ||
	    moyureaderOverlayProgressLabel == nil ||
	    moyureaderOverlayOpacityLabel == nil) {
		return;
	}

	NSInteger chapterCount = (NSInteger)moyureaderOverlayChapterTitles.count;
	NSInteger currentChapter = MAX(0, MIN(moyureaderOverlayCurrentChapterIndex, MAX(chapterCount - 1, 0)));
	BOOL hasPrevChapter = chapterCount > 0 && currentChapter > 0;
	BOOL hasNextChapter = chapterCount > 0 && currentChapter < chapterCount - 1;
	moyureaderOverlayCurrentChapterIndex = currentChapter;
	moyureaderOverlayCurrentProgress = MAX(0.0, MIN(moyureaderOverlayCurrentProgress, 100.0));
	moyureaderOverlayCurrentOpacity = MoyuReaderClampOverlayOpacity(moyureaderOverlayCurrentOpacity);

	[moyureaderOverlayPrevButton setEnabled:hasPrevChapter];
	[moyureaderOverlayNextButton setEnabled:hasNextChapter];
	[moyureaderOverlayPrevButton setAlphaValue:(hasPrevChapter ? 1.0 : 0.45)];
	[moyureaderOverlayNextButton setAlphaValue:(hasNextChapter ? 1.0 : 0.45)];
	double opacitySliderValue = MoyuReaderOverlayOpacitySliderValue(moyureaderOverlayCurrentOpacity);
	[moyureaderOverlayOpacitySlider setDoubleValue:opacitySliderValue];
	[moyureaderOverlayOpacitySlider setToolTip:[NSString stringWithFormat:@"透明度 %.2f", opacitySliderValue]];
	[moyureaderOverlayProgressSlider setDoubleValue:moyureaderOverlayCurrentProgress];
	[moyureaderOverlayProgressSlider setToolTip:[NSString stringWithFormat:@"章节进度 %.0f%%", round(moyureaderOverlayCurrentProgress)]];
	[moyureaderOverlayProgressLabel setStringValue:[NSString stringWithFormat:@"章节进度 %.0f%%", round(moyureaderOverlayCurrentProgress)]];
	[moyureaderOverlayOpacityLabel setStringValue:@"透明度"];
	[moyureaderOverlayOpacityLabel setToolTip:[NSString stringWithFormat:@"透明度 %.2f", opacitySliderValue]];
	MoyuReaderSetOverlayButtonTitle(
		moyureaderOverlayPrevButton,
		@"上章",
		[[NSColor whiteColor] colorWithAlphaComponent:(hasPrevChapter ? 0.96 : 0.42)],
		[NSFont systemFontOfSize:12.0 weight:(hasPrevChapter ? NSFontWeightSemibold : NSFontWeightMedium)]
	);
	MoyuReaderSetOverlayButtonTitle(
		moyureaderOverlayNextButton,
		@"下章",
		[[NSColor whiteColor] colorWithAlphaComponent:(hasNextChapter ? 0.96 : 0.42)],
		[NSFont systemFontOfSize:12.0 weight:(hasNextChapter ? NSFontWeightSemibold : NSFontWeightMedium)]
	);
	MoyuReaderSetOverlayButtonTitle(
		moyureaderOverlayDirectoryButton,
		(moyureaderOverlayChapterPanelVisible ? @"收起" : @"目录"),
		[[NSColor whiteColor] colorWithAlphaComponent:0.92],
		[NSFont systemFontOfSize:12.0 weight:NSFontWeightSemibold]
	);
	MoyuReaderSetOverlayButtonTitle(
		moyureaderOverlayCamouflageButton,
		@"收纳",
		[[NSColor whiteColor] colorWithAlphaComponent:0.94],
		[NSFont systemFontOfSize:12.0 weight:NSFontWeightSemibold]
	);
	moyureaderOverlayCamouflageButton.layer.backgroundColor = (
		moyureaderOverlayCamouflageEnabled
			? [NSColor colorWithCalibratedRed:0.33 green:0.63 blue:0.55 alpha:0.92]
			: [[NSColor blackColor] colorWithAlphaComponent:0.16]
	).CGColor;
	moyureaderOverlayCamouflageButton.layer.borderColor = (
		moyureaderOverlayCamouflageEnabled
			? [[NSColor whiteColor] colorWithAlphaComponent:0.34]
			: [[NSColor whiteColor] colorWithAlphaComponent:0.16]
	).CGColor;
	[moyureaderOverlayCamouflageButton setToolTip:(moyureaderOverlayCamouflageEnabled ? @"移出后收纳，双击挂件展开" : @"收纳伪装已关闭")];
	MoyuReaderSetOverlayButtonTitle(
		moyureaderOverlayCloseButton,
		@"退出",
		[[NSColor whiteColor] colorWithAlphaComponent:0.92],
		[NSFont systemFontOfSize:12.0 weight:NSFontWeightSemibold]
	);
}

static void MoyuReaderRefreshOverlayProgressBar(void) {
	if (moyureaderOverlayProgressSlider == nil) {
		return;
	}

	[moyureaderOverlayProgressSlider setDoubleValue:MAX(0.0, MIN(moyureaderOverlayCurrentProgress, 100.0))];
}

static BOOL MoyuReaderTryEnqueueOverlayBoundaryChapterAction(BOOL moveToNextChapter) {
	if (!moyureaderOverlayVisible || moyureaderOverlayChapterTitles.count == 0) {
		return NO;
	}

	CFTimeInterval now = CFAbsoluteTimeGetCurrent();
	if (now < moyureaderOverlayBoundaryActionCooldownUntil) {
		return NO;
	}

	NSInteger targetChapter = moveToNextChapter
		? moyureaderOverlayCurrentChapterIndex + 1
		: moyureaderOverlayCurrentChapterIndex - 1;
	if (targetChapter < 0 || targetChapter >= (NSInteger)moyureaderOverlayChapterTitles.count) {
		return NO;
	}

	moyureaderOverlayBoundaryActionCooldownUntil =
		now + MoyuReaderOverlayBoundaryChapterSwitchCooldown;
	MoyuReaderEnqueueOverlayAction(moveToNextChapter ? @"next" : @"prev", -1, NAN, NO);
	return YES;
}

static void MoyuReaderRefreshOverlayChapterButtons(void) {
	if (moyureaderOverlayChapterListContentView == nil) {
		return;
	}

	if (moyureaderOverlayChapterButtons == nil) {
		moyureaderOverlayChapterButtons = [[NSMutableArray alloc] init];
	}

	for (NSButton *button in moyureaderOverlayChapterButtons) {
		[button removeFromSuperview];
	}
	[moyureaderOverlayChapterButtons removeAllObjects];

	for (NSInteger index = 0; index < moyureaderOverlayChapterTitles.count; index++) {
		NSString *title = moyureaderOverlayChapterTitles[index];
		NSButton *button = MoyuReaderCreateOverlayChapterButton(title, index);
		[moyureaderOverlayChapterButtons addObject:button];
		[moyureaderOverlayChapterListContentView addSubview:button];
	}
}

static void MoyuReaderApplyOverlayChapterButtonStyles(void) {
	for (NSButton *button in moyureaderOverlayChapterButtons) {
		BOOL selected = (button.tag == moyureaderOverlayCurrentChapterIndex);
		NSString *title = button.title;
		if (title == nil || title.length == 0) {
			title = button.attributedTitle.string ?: @"";
		}
		button.layer.backgroundColor = (selected
			? [NSColor colorWithCalibratedRed:0.30 green:0.36 blue:0.48 alpha:0.98]
			: [NSColor colorWithCalibratedWhite:0.15 alpha:0.98]).CGColor;
		button.layer.borderColor = (selected
			? [[NSColor whiteColor] colorWithAlphaComponent:0.30]
			: [[NSColor whiteColor] colorWithAlphaComponent:0.10]).CGColor;
		MoyuReaderSetOverlayButtonTitle(
			button,
			title,
			[[NSColor whiteColor] colorWithAlphaComponent:(selected ? 0.99 : 0.92)],
			[NSFont systemFontOfSize:12.0 weight:(selected ? NSFontWeightSemibold : NSFontWeightMedium)]
		);
	}
}

static void MoyuReaderScrollCurrentChapterButtonIntoView(void) {
	if (moyureaderOverlayChapterListScrollView == nil || moyureaderOverlayChapterListContentView == nil) {
		return;
	}

	NSClipView *clipView = moyureaderOverlayChapterListScrollView.contentView;
	CGFloat visibleHeight = NSHeight(clipView.bounds);
	CGFloat contentHeight = NSHeight(moyureaderOverlayChapterListContentView.frame);
	CGFloat maxOffsetY = MAX(0.0, contentHeight - visibleHeight);

	for (NSButton *button in moyureaderOverlayChapterButtons) {
		if (button.tag == moyureaderOverlayCurrentChapterIndex) {
			CGFloat targetY = NSMidY(button.frame) - (visibleHeight / 2.0);
			targetY = MIN(MAX(targetY, 0.0), maxOffsetY);
			[clipView scrollToPoint:NSMakePoint(0.0, targetY)];
			[moyureaderOverlayChapterListScrollView reflectScrolledClipView:clipView];
			return;
		}
	}
}

static void MoyuReaderSetOverlayChapterPanelVisible(BOOL visible) {
	moyureaderOverlayChapterPanelVisible = visible;

	if (visible) {
		MoyuReaderRefreshOverlayCurrentChapterFromVisibleLocation();
	}

	if (moyureaderOverlayChapterPanelView != nil) {
		[moyureaderOverlayRootView addSubview:moyureaderOverlayChapterPanelView positioned:NSWindowAbove relativeTo:moyureaderOverlayScrollView];
		[moyureaderOverlayChapterPanelView setHidden:!(visible && moyureaderOverlayChromeVisible)];
	}

	MoyuReaderRefreshOverlayControls();
	MoyuReaderLayoutDesktopReaderOverlayViews();
	if (visible) {
		dispatch_async(dispatch_get_main_queue(), ^{
			if (MoyuReaderRefreshOverlayCurrentChapterFromVisibleLocation()) {
				MoyuReaderRefreshOverlayControls();
				MoyuReaderApplyOverlayChapterButtonStyles();
			}
			MoyuReaderScrollCurrentChapterButtonIntoView();
		});
	}
}

static void MoyuReaderDismissOverlayChapterPanel(void) {
	if (!moyureaderOverlayChapterPanelVisible) {
		return;
	}

	MoyuReaderSetOverlayChapterPanelVisible(NO);
}

static NSWindow *MoyuReaderResolveMainAppWindow(void) {
	for (NSWindow *window in [NSApp windows]) {
		if (window != nil && window != moyureaderOverlayWindow) {
			return window;
		}
	}

	NSWindow *mainWindow = [NSApp mainWindow];
	if (mainWindow != nil && mainWindow != moyureaderOverlayWindow) {
		return mainWindow;
	}

	NSWindow *keyWindow = [NSApp keyWindow];
	if (keyWindow != nil && keyWindow != moyureaderOverlayWindow) {
		return keyWindow;
	}

	return nil;
}

static NSScreen *MoyuReaderPreferredDesktopReaderOverlayScreen(NSRect frame, NSScreen *preferredScreen) {
	if (preferredScreen != nil) {
		return preferredScreen;
	}

	NSPoint frameCenter = NSMakePoint(NSMidX(frame), NSMidY(frame));
	for (NSScreen *screen in [NSScreen screens]) {
		if (NSPointInRect(frameCenter, screen.frame)) {
			return screen;
		}
	}

	NSScreen *mainScreen = [NSScreen mainScreen];
	if (mainScreen != nil) {
		return mainScreen;
	}

	return [[NSScreen screens] firstObject];
}

static NSRect MoyuReaderClampDesktopReaderOverlayFrame(NSRect frame, NSScreen *preferredScreen) {
	NSScreen *screen = MoyuReaderPreferredDesktopReaderOverlayScreen(frame, preferredScreen);
	if (screen == nil) {
		return frame;
	}

	CGFloat minWidth = MoyuReaderOverlayCurrentMinimumWidth();
	CGFloat minHeight = MoyuReaderOverlayCurrentMinimumHeight();
	NSRect visibleFrame = screen.visibleFrame;
	CGFloat maxWidth = MAX(minWidth, visibleFrame.size.width - (MoyuReaderOverlayEdgeMargin * 2.0));
	CGFloat maxHeight = MAX(minHeight, visibleFrame.size.height - (MoyuReaderOverlayEdgeMargin * 2.0));

	frame.size.width = MIN(MAX(frame.size.width, minWidth), maxWidth);
	frame.size.height = MIN(MAX(frame.size.height, minHeight), maxHeight);

	CGFloat minX = visibleFrame.origin.x + MoyuReaderOverlayEdgeMargin;
	CGFloat maxX = NSMaxX(visibleFrame) - frame.size.width - MoyuReaderOverlayEdgeMargin;
	if (maxX < minX) {
		frame.origin.x = visibleFrame.origin.x + (visibleFrame.size.width - frame.size.width) / 2.0;
	} else {
		frame.origin.x = MIN(MAX(frame.origin.x, minX), maxX);
	}

	CGFloat minY = visibleFrame.origin.y + MoyuReaderOverlayEdgeMargin;
	CGFloat maxY = NSMaxY(visibleFrame) - frame.size.height - MoyuReaderOverlayEdgeMargin;
	if (maxY < minY) {
		frame.origin.y = visibleFrame.origin.y + (visibleFrame.size.height - frame.size.height) / 2.0;
	} else {
		frame.origin.y = MIN(MAX(frame.origin.y, minY), maxY);
	}

	return frame;
}

// 优先复用用户上一次拖拽后的浮窗位置；首次打开则贴近主阅读窗口中心。
static NSRect MoyuReaderPreferredDesktopReaderOverlayFrame(void) {
	if (moyureaderOverlayWindow != nil) {
		return MoyuReaderClampDesktopReaderOverlayFrame(
			moyureaderOverlayWindow.frame,
			moyureaderOverlayWindow.screen ?: moyureaderMainAppWindow.screen
		);
	}

	NSSize overlaySize = MoyuReaderOverlayPersistedSize();
	NSRect frame = NSMakeRect(0, 0, overlaySize.width, overlaySize.height);
	NSScreen *preferredScreen = nil;

	if (moyureaderMainAppWindow != nil) {
		preferredScreen = moyureaderMainAppWindow.screen;
		frame.origin.x = NSMidX(moyureaderMainAppWindow.frame) - (overlaySize.width / 2.0);
		frame.origin.y = NSMidY(moyureaderMainAppWindow.frame) - (overlaySize.height / 2.0);
	} else {
		preferredScreen = [NSScreen mainScreen] ?: [[NSScreen screens] firstObject];
		if (preferredScreen != nil) {
			frame.origin.x = NSMidX(preferredScreen.visibleFrame) - (overlaySize.width / 2.0);
			frame.origin.y = NSMidY(preferredScreen.visibleFrame) - (overlaySize.height / 2.0);
		}
	}

	return MoyuReaderClampDesktopReaderOverlayFrame(frame, preferredScreen);
}

static NSColor *MoyuReaderOverlayColor(int red, int green, int blue, double alpha) {
	return [NSColor colorWithCalibratedRed:MAX(0, MIN(red, 255)) / 255.0
	                                 green:MAX(0, MIN(green, 255)) / 255.0
	                                  blue:MAX(0, MIN(blue, 255)) / 255.0
	                                 alpha:MAX(0.0, MIN(alpha, 1.0))];
}

static BOOL MoyuReaderOverlayStringLooksLikeHTML(NSString *string) {
	if (string == nil || string.length == 0) {
		return NO;
	}

	NSRange leftBracket = [string rangeOfString:@"<"];
	NSRange rightBracket = [string rangeOfString:@">"];
	return leftBracket.location != NSNotFound && rightBracket.location != NSNotFound;
}

static NSArray<NSDictionary *> *MoyuReaderExtractOverlayChapterHTMLFragments(NSString *string) {
	if (string == nil || string.length == 0) {
		return @[];
	}

	NSMutableArray<NSDictionary *> *fragments = [NSMutableArray array];
	NSString *startPrefix = @"<!--moyureader-chapter:";
	NSString *startSuffix = @":start-->";
	NSUInteger searchLocation = 0;

	while (searchLocation < string.length) {
		NSRange startPrefixRange = [string rangeOfString:startPrefix
		                                         options:0
		                                           range:NSMakeRange(searchLocation, string.length - searchLocation)];
		if (startPrefixRange.location == NSNotFound) {
			break;
		}

		NSUInteger indexStart = NSMaxRange(startPrefixRange);
		NSRange startSuffixRange = [string rangeOfString:startSuffix
		                                         options:0
		                                           range:NSMakeRange(indexStart, string.length - indexStart)];
		if (startSuffixRange.location == NSNotFound) {
			break;
		}

		NSString *chapterIndexString = [string substringWithRange:NSMakeRange(
			indexStart,
			startSuffixRange.location - indexStart
		)];
		NSInteger chapterIndex = [chapterIndexString integerValue];
		NSString *endMarker = [NSString stringWithFormat:@"<!--moyureader-chapter:%ld:end-->", (long)chapterIndex];
		NSUInteger fragmentStart = NSMaxRange(startSuffixRange);
		NSRange endMarkerRange = [string rangeOfString:endMarker
		                                      options:0
		                                        range:NSMakeRange(fragmentStart, string.length - fragmentStart)];
		if (endMarkerRange.location == NSNotFound) {
			searchLocation = fragmentStart;
			continue;
		}

		NSString *fragmentHTML = [string substringWithRange:NSMakeRange(
			fragmentStart,
			endMarkerRange.location - fragmentStart
		)];
		[fragments addObject:@{
			@"index": @(chapterIndex),
			@"html": fragmentHTML ?: @"",
		}];
		searchLocation = NSMaxRange(endMarkerRange);
	}

	return [fragments copy];
}

static BOOL MoyuReaderOverlayChapterFragmentsSharePrefix(NSArray<NSDictionary *> *previousFragments, NSArray<NSDictionary *> *nextFragments) {
	if (previousFragments.count == 0 || nextFragments.count < previousFragments.count) {
		return NO;
	}

	for (NSInteger index = 0; index < previousFragments.count; index++) {
		NSDictionary *previousFragment = previousFragments[index];
		NSDictionary *nextFragment = nextFragments[index];
		if (![previousFragment[@"index"] isEqual:nextFragment[@"index"]]) {
			return NO;
		}

		NSString *previousHTML = [previousFragment[@"html"] isKindOfClass:[NSString class]]
			? (NSString *)previousFragment[@"html"]
			: @"";
		NSString *nextHTML = [nextFragment[@"html"] isKindOfClass:[NSString class]]
			? (NSString *)nextFragment[@"html"]
			: @"";
		if (![previousHTML isEqualToString:nextHTML]) {
			return NO;
		}
	}

	return YES;
}

static NSString *MoyuReaderWrapOverlayHTMLFragment(NSString *fragment) {
	NSString *safeFragment = fragment ?: @"";
	return [NSString stringWithFormat:
		@"<!DOCTYPE html><html><head><meta charset=\"utf-8\" /><style>"
		"body { margin: 0; padding: 0; }"
		"article { margin: 0; padding: 0; }"
		"p, div, section, blockquote, pre, ul, ol, figure { margin: 0 0 1em; }"
		".overlay-chapter-title { margin: 0 0 1.2em; }"
		"img { display: block; max-width: 100%%; height: auto; margin: 0 auto; }"
		"figcaption { margin-top: 0.4em; }"
		"</style></head><body><article>%@</article></body></html>",
		safeFragment
	];
}

static NSMutableAttributedString *MoyuReaderImportOverlayHTMLAttributedString(NSString *string) {
	if (!MoyuReaderOverlayStringLooksLikeHTML(string)) {
		return nil;
	}

	NSData *htmlData = [string dataUsingEncoding:NSUTF8StringEncoding];
	if (htmlData == nil || htmlData.length == 0) {
		return nil;
	}

	NSError *error = nil;
	NSAttributedString *importedText = [[NSAttributedString alloc] initWithData:htmlData
	                                                            options:@{
	                                                                NSDocumentTypeDocumentOption: NSHTMLTextDocumentType,
	                                                                NSCharacterEncodingDocumentOption: @(NSUTF8StringEncoding),
	                                                            }
	                                                 documentAttributes:nil
	                                                              error:&error];
	if (error != nil || importedText == nil) {
		return MoyuReaderBuildOverlayAttributedStringFromImageFallbackHTML(string);
	}

	NSMutableAttributedString *result = [[NSMutableAttributedString alloc] initWithAttributedString:importedText];
	if ([string rangeOfString:@"<img" options:NSCaseInsensitiveSearch].location != NSNotFound &&
	    MoyuReaderCountOverlayAttachments(result) == 0) {
		NSMutableAttributedString *fallback = MoyuReaderBuildOverlayAttributedStringFromImageFallbackHTML(string);
		if (fallback != nil && fallback.length > 0) {
			return fallback;
		}
	}

	return result;
}

static NSUInteger MoyuReaderCountOverlayAttachments(NSAttributedString *attributedText) {
	if (attributedText == nil || attributedText.length == 0) {
		return 0;
	}

	__block NSUInteger attachmentCount = 0;
	[attributedText enumerateAttribute:NSAttachmentAttributeName
	                           inRange:NSMakeRange(0, attributedText.length)
	                           options:0
	                        usingBlock:^(id value, NSRange range, BOOL *stop) {
		if ([value isKindOfClass:[NSTextAttachment class]]) {
			attachmentCount += 1;
		}
	}];
	return attachmentCount;
}

static NSImage *MoyuReaderCreateOverlayImageFromDataURL(NSString *dataURL) {
	if (dataURL == nil || dataURL.length == 0) {
		return nil;
	}

	NSRange commaRange = [dataURL rangeOfString:@","];
	if (commaRange.location == NSNotFound) {
		return nil;
	}

	NSString *base64Part = [dataURL substringFromIndex:commaRange.location + 1];
	NSData *imageData = [[NSData alloc] initWithBase64EncodedString:base64Part options:NSDataBase64DecodingIgnoreUnknownCharacters];
	if (imageData == nil || imageData.length == 0) {
		return nil;
	}

	return [[NSImage alloc] initWithData:imageData];
}

static NSMutableAttributedString *MoyuReaderBuildOverlayAttributedStringFromImageFallbackHTML(NSString *string) {
	if (string == nil || string.length == 0) {
		return nil;
	}

	NSError *regexError = nil;
	NSRegularExpression *imgRegex = [NSRegularExpression regularExpressionWithPattern:@"(?is)<img\\b[^>]*?src\\s*=\\s*[\"'](data:image/[^\"']+)[\"'][^>]*?(?:alt\\s*=\\s*[\"']([^\"']*)[\"'])?[^>]*>"
	                                                                       options:0
	                                                                         error:&regexError];
	if (regexError != nil || imgRegex == nil) {
		return nil;
	}

	NSArray<NSTextCheckingResult *> *matches = [imgRegex matchesInString:string options:0 range:NSMakeRange(0, string.length)];
	if (matches.count == 0) {
		return nil;
	}

	NSMutableAttributedString *combined = [[NSMutableAttributedString alloc] init];
	NSUInteger cursor = 0;

	for (NSTextCheckingResult *match in matches) {
		if (match.range.location > cursor) {
			NSString *htmlChunk = [string substringWithRange:NSMakeRange(cursor, match.range.location - cursor)];
			NSMutableAttributedString *chunkText = nil;
			NSString *wrappedChunk = MoyuReaderWrapOverlayHTMLFragment(htmlChunk) ?: @"";
			NSData *chunkData = [wrappedChunk dataUsingEncoding:NSUTF8StringEncoding];
			if (chunkData != nil && chunkData.length > 0) {
				chunkText = [[NSMutableAttributedString alloc] initWithAttributedString:[[NSAttributedString alloc] initWithData:chunkData
				                                                                                                              options:@{
				                                                                                                                  NSDocumentTypeDocumentOption: NSHTMLTextDocumentType,
				                                                                                                                  NSCharacterEncodingDocumentOption: @(NSUTF8StringEncoding),
				                                                                                                              }
				                                                                                                   documentAttributes:nil
				                                                                                                                error:nil]];
			}
			if (chunkText != nil && chunkText.length > 0) {
				[combined appendAttributedString:chunkText];
			}
		}

		NSString *dataURL = [string substringWithRange:[match rangeAtIndex:1]];
		NSString *altText = @"";
		if (match.numberOfRanges > 2) {
			NSRange altRange = [match rangeAtIndex:2];
			if (altRange.location != NSNotFound) {
				altText = [string substringWithRange:altRange] ?: @"";
			}
		}

		NSImage *image = MoyuReaderCreateOverlayImageFromDataURL(dataURL);
		if (image != nil) {
			NSTextAttachment *attachment = [[NSTextAttachment alloc] init];
			attachment.image = image;
			NSAttributedString *attachmentString = [NSAttributedString attributedStringWithAttachment:attachment];
			if (combined.length > 0) {
				[combined appendAttributedString:[[NSAttributedString alloc] initWithString:@"\n"]];
			}
			[combined appendAttributedString:attachmentString];
			if (altText.length > 0) {
				[combined appendAttributedString:[[NSAttributedString alloc] initWithString:[NSString stringWithFormat:@"\n%@\n", altText]]];
			} else {
				[combined appendAttributedString:[[NSAttributedString alloc] initWithString:@"\n"]];
			}
		}

		cursor = NSMaxRange(match.range);
	}

	if (cursor < string.length) {
		NSString *tailChunk = [string substringFromIndex:cursor];
		NSString *wrappedTail = MoyuReaderWrapOverlayHTMLFragment(tailChunk) ?: @"";
		NSData *tailData = [wrappedTail dataUsingEncoding:NSUTF8StringEncoding];
		if (tailData != nil && tailData.length > 0) {
			NSAttributedString *tailText = [[NSAttributedString alloc] initWithData:tailData
			                                                                options:@{
			                                                                    NSDocumentTypeDocumentOption: NSHTMLTextDocumentType,
			                                                                    NSCharacterEncodingDocumentOption: @(NSUTF8StringEncoding),
			                                                                }
			                                                     documentAttributes:nil
			                                                                  error:nil];
			if (tailText != nil && tailText.length > 0) {
				[combined appendAttributedString:tailText];
			}
		}
	}

	return combined.length > 0 ? combined : nil;
}

static NSMutableAttributedString *MoyuReaderCreateOverlayAttributedString(NSString *string, NSArray<NSNumber *> **chapterIndicesOut, NSArray<NSValue *> **chapterRangesOut) {
	if (chapterIndicesOut != NULL) {
		*chapterIndicesOut = nil;
	}
	if (chapterRangesOut != NULL) {
		*chapterRangesOut = nil;
	}

	NSArray<NSDictionary *> *chapterFragments = MoyuReaderExtractOverlayChapterHTMLFragments(string);
	if (chapterFragments.count == 0) {
		return MoyuReaderImportOverlayHTMLAttributedString(string);
	}

	NSMutableAttributedString *combined = [[NSMutableAttributedString alloc] init];
	NSMutableArray<NSNumber *> *chapterIndices = [NSMutableArray array];
	NSMutableArray<NSValue *> *chapterRanges = [NSMutableArray array];

	for (NSInteger index = 0; index < chapterFragments.count; index++) {
		NSDictionary *fragment = chapterFragments[index];
		NSInteger chapterIndex = [fragment[@"index"] integerValue];
		NSString *fragmentHTML = [fragment[@"html"] isKindOfClass:[NSString class]]
			? (NSString *)fragment[@"html"]
			: @"";
		NSMutableAttributedString *chapterText = MoyuReaderImportOverlayHTMLAttributedString(
			MoyuReaderWrapOverlayHTMLFragment(fragmentHTML)
		);
		if (chapterText == nil || chapterText.length == 0) {
			chapterText = [[NSMutableAttributedString alloc] initWithString:@"暂无内容"];
		}

		NSUInteger chapterRangeStart = combined.length;
		[combined appendAttributedString:chapterText];
		NSUInteger chapterRangeLength = MAX(combined.length - chapterRangeStart, 1);
		[chapterIndices addObject:@(chapterIndex)];
		[chapterRanges addObject:[NSValue valueWithRange:NSMakeRange(chapterRangeStart, chapterRangeLength)]];

		if (index < chapterFragments.count - 1) {
			[combined appendAttributedString:[[NSAttributedString alloc] initWithString:@"\n\n"]];
		}
	}

	if (chapterIndicesOut != NULL) {
		*chapterIndicesOut = [chapterIndices copy];
	}
	if (chapterRangesOut != NULL) {
		*chapterRangesOut = [chapterRanges copy];
	}

	return combined;
}

static NSMutableAttributedString *MoyuReaderCreateOverlayChapterAttributedString(NSDictionary *fragment) {
	NSString *fragmentHTML = [fragment[@"html"] isKindOfClass:[NSString class]]
		? (NSString *)fragment[@"html"]
		: @"";
	NSMutableAttributedString *chapterText = MoyuReaderImportOverlayHTMLAttributedString(
		MoyuReaderWrapOverlayHTMLFragment(fragmentHTML)
	);
	if (chapterText == nil || chapterText.length == 0) {
		chapterText = [[NSMutableAttributedString alloc] initWithString:@"暂无内容"];
	}

	return chapterText;
}

static BOOL MoyuReaderAppendOverlayChaptersToTextView(
	MoyuReaderOverlayTextView *textView,
	NSArray<NSDictionary *> *chapterFragments,
	NSInteger startIndex,
	int fontSize,
	double lineHeight,
	double opacity,
	int red,
	int green,
	int blue
) {
	if (textView == nil || textView.textStorage == nil) {
		return NO;
	}

	if (startIndex < 0 || startIndex >= chapterFragments.count) {
		return NO;
	}

	NSMutableArray<NSNumber *> *chapterIndices = [moyureaderOverlayContentChapterIndices mutableCopy];
	if (chapterIndices == nil) {
		chapterIndices = [NSMutableArray array];
	}
	NSMutableArray<NSValue *> *chapterRanges = [moyureaderOverlayContentChapterRanges mutableCopy];
	if (chapterRanges == nil) {
		chapterRanges = [NSMutableArray array];
	}

	NSTextStorage *textStorage = textView.textStorage;
	[textStorage beginEditing];
	for (NSInteger index = startIndex; index < chapterFragments.count; index++) {
		NSDictionary *fragment = chapterFragments[index];
		NSMutableAttributedString *chapterText = MoyuReaderCreateOverlayChapterAttributedString(fragment);
		MoyuReaderApplyOverlayTextAttributes(chapterText, fontSize, lineHeight, opacity, red, green, blue);

		if (textStorage.length > 0) {
			[textStorage appendAttributedString:[[NSAttributedString alloc] initWithString:@"\n\n"]];
		}

		NSUInteger chapterRangeStart = textStorage.length;
		[textStorage appendAttributedString:chapterText];
		NSUInteger chapterRangeLength = MAX(textStorage.length - chapterRangeStart, 1);
		[chapterIndices addObject:@([fragment[@"index"] integerValue])];
		[chapterRanges addObject:[NSValue valueWithRange:NSMakeRange(chapterRangeStart, chapterRangeLength)]];
	}
	[textStorage endEditing];

	moyureaderOverlayContentChapterIndices = [chapterIndices copy];
	moyureaderOverlayContentChapterRanges = [chapterRanges copy];
	return YES;
}

static void MoyuReaderResizeOverlayTextViewToFitContent(NSTextView *textView, NSSize viewportSize) {
	if (textView == nil || textView.layoutManager == nil || textView.textContainer == nil) {
		return;
	}

	CGFloat viewportWidth = MAX(viewportSize.width, 120.0);
	CGFloat viewportHeight = MAX(viewportSize.height, 1.0);
	[textView.textContainer setContainerSize:NSMakeSize(viewportWidth, CGFLOAT_MAX)];
	[textView.layoutManager ensureLayoutForTextContainer:textView.textContainer];

	NSRect usedRect = [textView.layoutManager usedRectForTextContainer:textView.textContainer];
	CGFloat contentHeight = ceil(usedRect.size.height + (textView.textContainerInset.height * 2.0));
	CGFloat resolvedHeight = MAX(viewportHeight, contentHeight);
	[textView setMinSize:NSMakeSize(viewportWidth, resolvedHeight)];
	[textView setMaxSize:NSMakeSize(viewportWidth, CGFLOAT_MAX)];
	[textView setFrame:NSMakeRect(0.0, 0.0, viewportWidth, resolvedHeight)];
}

static NSFont *MoyuReaderOverlayTextFont(NSFont *existingFont, CGFloat pointSize) {
	NSString *fontName = existingFont.fontName.lowercaseString ?: @"";
	BOOL wantsBold = NO;
	BOOL wantsItalic = NO;
	BOOL wantsMonospace = NO;

	if (existingFont != nil) {
		NSFontDescriptorSymbolicTraits traits = existingFont.fontDescriptor.symbolicTraits;
		wantsBold = (traits & NSFontBoldTrait) == NSFontBoldTrait;
		wantsItalic = [fontName containsString:@"italic"] || [fontName containsString:@"oblique"];
		wantsMonospace =
			[fontName containsString:@"mono"] ||
			[fontName containsString:@"courier"] ||
			[fontName containsString:@"menlo"] ||
			[fontName containsString:@"code"];
	}

	NSFont *font = wantsMonospace
		? [NSFont monospacedSystemFontOfSize:pointSize weight:wantsBold ? NSFontWeightSemibold : NSFontWeightRegular]
		: [NSFont systemFontOfSize:pointSize weight:wantsBold ? NSFontWeightSemibold : NSFontWeightMedium];

	if (wantsItalic) {
		NSFont *italicFont = [[NSFontManager sharedFontManager] convertFont:font toHaveTrait:NSItalicFontMask];
		if (italicFont != nil) {
			font = italicFont;
		}
	}

	return font ?: [NSFont systemFontOfSize:pointSize weight:NSFontWeightMedium];
}

static void MoyuReaderApplyOverlayTextAttributes(NSMutableAttributedString *attributedText, int fontSize, double lineHeight, double opacity, int red, int green, int blue) {
	if (attributedText == nil || attributedText.length == 0) {
		return;
	}

	NSMutableParagraphStyle *paragraphStyle = [[NSMutableParagraphStyle alloc] init];
	[paragraphStyle setLineBreakMode:NSLineBreakByWordWrapping];
	[paragraphStyle setParagraphSpacing:MAX(8.0, fontSize * 0.55)];
	[paragraphStyle setLineSpacing:MAX(0.0, fontSize * (MAX(lineHeight, 1.0) - 1.0))];

	NSShadow *shadow = [[NSShadow alloc] init];
	[shadow setShadowBlurRadius:8.0];
	[shadow setShadowOffset:NSMakeSize(0, 1)];
	[shadow setShadowColor:[[NSColor blackColor] colorWithAlphaComponent:0.15]];

	NSRange fullRange = NSMakeRange(0, attributedText.length);
	NSAttributedString *fontSnapshot = [attributedText copy];
	[attributedText beginEditing];
	[attributedText addAttribute:NSForegroundColorAttributeName
	                       value:MoyuReaderOverlayColor(red, green, blue, 1.0)
	                       range:fullRange];
	[attributedText addAttribute:NSParagraphStyleAttributeName value:paragraphStyle range:fullRange];
	[attributedText addAttribute:NSShadowAttributeName value:shadow range:fullRange];
	[fontSnapshot enumerateAttribute:NSFontAttributeName
	                         inRange:fullRange
	                         options:0
	                      usingBlock:^(id value, NSRange range, BOOL *stop) {
		NSFont *existingFont = [value isKindOfClass:[NSFont class]] ? (NSFont *)value : nil;
		NSFont *nextFont = MoyuReaderOverlayTextFont(existingFont, MAX(fontSize, 12));
		[attributedText addAttribute:NSFontAttributeName value:nextFont range:range];
	}];
	[attributedText endEditing];
}

static NSImage *MoyuReaderResolveOverlayAttachmentImage(NSTextAttachment *attachment) {
	if (attachment == nil) {
		return nil;
	}

	NSImage *image = attachment.image;
	if (image == nil && attachment.contents != nil) {
		image = [[NSImage alloc] initWithData:attachment.contents];
	}

	if (image == nil && attachment.fileWrapper.regularFileContents != nil) {
		image = [[NSImage alloc] initWithData:attachment.fileWrapper.regularFileContents];
	}

	if (image == nil) {
		image = attachment.image;
	}

	if (image != nil) {
		attachment.image = image;
	}

	return image;
}

static void MoyuReaderResizeOverlayTextAttachments(NSTextStorage *textStorage, CGFloat availableWidth) {
	if (textStorage == nil || textStorage.length == 0 || availableWidth <= 0) {
		return;
	}

	CGFloat maxWidth = MAX(120.0, availableWidth);
	NSRange fullRange = NSMakeRange(0, textStorage.length);
	[textStorage enumerateAttribute:NSAttachmentAttributeName
	                        inRange:fullRange
	                        options:0
	                     usingBlock:^(id value, NSRange range, BOOL *stop) {
		if (![value isKindOfClass:[NSTextAttachment class]]) {
			return;
		}

		NSTextAttachment *attachment = (NSTextAttachment *)value;
		NSImage *image = MoyuReaderResolveOverlayAttachmentImage(attachment);
		if (image == nil || image.size.width <= 0 || image.size.height <= 0) {
			return;
		}

		CGFloat scale = MIN(1.0, maxWidth / image.size.width);
		CGFloat targetWidth = floor(image.size.width * scale);
		CGFloat targetHeight = floor(image.size.height * scale);
		if (fabs(attachment.bounds.size.width - targetWidth) < 0.5 &&
		    fabs(attachment.bounds.size.height - targetHeight) < 0.5) {
			return;
		}

		attachment.bounds = CGRectMake(
			0,
			0,
			targetWidth,
			targetHeight
		);
	}];
}

static void MoyuReaderApplyOverlayContentAlpha(double opacity) {
	double clampedOpacity = MoyuReaderClampOverlayOpacity(opacity);
	if (moyureaderOverlayScrollView != nil) {
		if (moyureaderOverlayScrollView.layer != nil) {
			moyureaderOverlayScrollView.layer.opacity = 1.0f;
		} else {
			[moyureaderOverlayScrollView setAlphaValue:1.0];
		}
	}

	MoyuReaderOverlayTextView *textView = (MoyuReaderOverlayTextView *)[moyureaderOverlayScrollView documentView];
	if (textView != nil) {
		if (textView.layer != nil) {
			textView.layer.opacity = (float)clampedOpacity;
		} else {
			[textView setAlphaValue:clampedOpacity];
		}
	}
}

static NSDictionary *MoyuReaderResolveOverlayReadingLocation(void) {
	MoyuReaderOverlayTextView *textView = (MoyuReaderOverlayTextView *)[moyureaderOverlayScrollView documentView];
	if (textView == nil || textView.layoutManager == nil || textView.textContainer == nil) {
		return nil;
	}

	if (moyureaderOverlayContentChapterIndices.count == 0 || moyureaderOverlayContentChapterRanges.count == 0) {
		return nil;
	}

	NSRect visibleRect = [moyureaderOverlayScrollView documentVisibleRect];
	if (NSHeight(visibleRect) <= 0.0) {
		return nil;
	}

	NSPoint anchorPoint = NSMakePoint(
		textView.textContainerInset.width + 2.0,
		NSMinY(visibleRect) + (NSHeight(visibleRect) * 0.18)
	);
	NSLayoutManager *layoutManager = textView.layoutManager;
	NSUInteger glyphCount = layoutManager.numberOfGlyphs;
	if (glyphCount == 0) {
		return nil;
	}

	NSUInteger glyphIndex = [layoutManager glyphIndexForPoint:anchorPoint
	                                          inTextContainer:textView.textContainer
	                           fractionOfDistanceThroughGlyph:nil];
	if (glyphIndex >= glyphCount) {
		glyphIndex = glyphCount - 1;
	}

	NSUInteger characterIndex = [layoutManager characterIndexForGlyphAtIndex:glyphIndex];
	NSInteger resolvedChapterIndex = [[moyureaderOverlayContentChapterIndices firstObject] integerValue];
	double resolvedChapterProgress = 0.0;

	for (NSInteger index = 0; index < moyureaderOverlayContentChapterRanges.count; index++) {
		NSRange chapterRange = [moyureaderOverlayContentChapterRanges[index] rangeValue];
		if (chapterRange.length == 0) {
			continue;
		}

		if (characterIndex < chapterRange.location) {
			break;
		}

		resolvedChapterIndex = [moyureaderOverlayContentChapterIndices[index] integerValue];
		NSUInteger clampedCharacterIndex = characterIndex;
		if (clampedCharacterIndex >= NSMaxRange(chapterRange)) {
			clampedCharacterIndex = NSMaxRange(chapterRange) - 1;
		}

		resolvedChapterProgress = chapterRange.length <= 1
			? 0.0
			: (double)(clampedCharacterIndex - chapterRange.location) / (double)(chapterRange.length - 1);

		if (characterIndex < NSMaxRange(chapterRange)) {
			break;
		}
	}

	return @{
		@"chapterIndex": @(resolvedChapterIndex),
		@"progress": @(MAX(0.0, MIN(resolvedChapterProgress, 1.0))),
	};
}

static BOOL MoyuReaderScrollOverlayToReadingLocation(NSInteger chapterIndex, double progress) {
	MoyuReaderOverlayTextView *textView = (MoyuReaderOverlayTextView *)[moyureaderOverlayScrollView documentView];
	NSClipView *contentView = moyureaderOverlayScrollView.contentView;
	if (textView == nil || contentView == nil || textView.layoutManager == nil || textView.textContainer == nil) {
		return NO;
	}

	if (moyureaderOverlayContentChapterIndices.count == 0 || moyureaderOverlayContentChapterRanges.count == 0) {
		return NO;
	}

	NSRange targetRange = NSMakeRange(NSNotFound, 0);
	for (NSInteger index = 0; index < moyureaderOverlayContentChapterIndices.count; index++) {
		if ([moyureaderOverlayContentChapterIndices[index] integerValue] != chapterIndex) {
			continue;
		}

		targetRange = [moyureaderOverlayContentChapterRanges[index] rangeValue];
		break;
	}

	if (targetRange.location == NSNotFound || targetRange.length == 0) {
		return NO;
	}

	double clampedProgress = MAX(0.0, MIN(progress, 1.0));
	NSUInteger characterIndex = targetRange.location;
	if (targetRange.length > 1) {
		characterIndex += (NSUInteger)llround((double)(targetRange.length - 1) * clampedProgress);
	}
	if (characterIndex >= NSMaxRange(targetRange)) {
		characterIndex = NSMaxRange(targetRange) - 1;
	}

	NSLayoutManager *layoutManager = textView.layoutManager;
	[layoutManager ensureLayoutForTextContainer:textView.textContainer];
	NSUInteger glyphCount = layoutManager.numberOfGlyphs;
	if (glyphCount == 0) {
		return NO;
	}

	NSUInteger glyphIndex = [layoutManager glyphIndexForCharacterAtIndex:characterIndex];
	if (glyphIndex >= glyphCount) {
		glyphIndex = glyphCount - 1;
	}

	NSRect glyphRect = [layoutManager boundingRectForGlyphRange:NSMakeRange(glyphIndex, 1)
	                                           inTextContainer:textView.textContainer];
	CGFloat anchorOffset = NSHeight(contentView.bounds) * 0.18;
	CGFloat targetY = glyphRect.origin.y + textView.textContainerInset.height - anchorOffset;
	CGFloat maxOffsetY = MAX(0.0, NSHeight(textView.frame) - NSHeight(contentView.bounds));
	targetY = MIN(MAX(targetY, 0.0), maxOffsetY);

	[contentView scrollToPoint:NSMakePoint(0.0, targetY)];
	[moyureaderOverlayScrollView reflectScrolledClipView:contentView];
	moyureaderOverlayCurrentChapterIndex = chapterIndex;
	MoyuReaderOverlayDebugLog(
		@"scroll overlay to chapter=%ld progress=%.3f targetY=%.1f",
		(long)chapterIndex,
		clampedProgress,
		targetY
	);
	return YES;
}

static BOOL MoyuReaderRefreshOverlayCurrentChapterFromVisibleLocation(void) {
	NSDictionary *readingLocation = MoyuReaderResolveOverlayReadingLocation();
	if (readingLocation == nil) {
		return NO;
	}

	NSInteger chapterIndex = [readingLocation[@"chapterIndex"] integerValue];
	double chapterProgress = [readingLocation[@"progress"] doubleValue];
	moyureaderOverlayCurrentChapterIndex = chapterIndex;
	moyureaderOverlayCurrentProgress = MAX(0.0, MIN(chapterProgress * 100.0, 100.0));
	MoyuReaderOverlayDebugLog(
		@"refresh current chapter for directory chapter=%ld progress=%.3f",
		(long)chapterIndex,
		chapterProgress
	);
	return YES;
}

static void MoyuReaderNotifyOverlayReadingLocationIfNeeded(void) {
	if (!moyureaderOverlayVisible) {
		return;
	}

	NSDictionary *readingLocation = MoyuReaderResolveOverlayReadingLocation();
	if (readingLocation == nil) {
		return;
	}

	NSInteger chapterIndex = [readingLocation[@"chapterIndex"] integerValue];
	double chapterProgress = [readingLocation[@"progress"] doubleValue];
	moyureaderOverlayCurrentProgress = MAX(0.0, MIN(chapterProgress * 100.0, 100.0));
	CFTimeInterval now = CFAbsoluteTimeGetCurrent();
	BOOL chapterChanged = chapterIndex != moyureaderOverlayLastPositionActionChapterIndex;
	BOOL progressChangedEnough =
		moyureaderOverlayLastPositionActionProgress < 0.0 ||
		fabs(moyureaderOverlayLastPositionActionProgress - chapterProgress) >= 0.02;
	BOOL throttledLongEnough =
		moyureaderOverlayLastPositionActionTimestamp <= 0.0 ||
		(now - moyureaderOverlayLastPositionActionTimestamp) >= (1.0 / 12.0);

	if (!chapterChanged && !(progressChangedEnough && throttledLongEnough)) {
		return;
	}

	moyureaderOverlayLastPositionActionTimestamp = now;
	moyureaderOverlayLastPositionActionChapterIndex = chapterIndex;
	moyureaderOverlayLastPositionActionProgress = chapterProgress;

	MoyuReaderOverlayDebugLog(
		@"position chapter=%ld progress=%.3f scrollY=%.1f",
		(long)chapterIndex,
		chapterProgress,
		moyureaderOverlayScrollView != nil ? moyureaderOverlayScrollView.contentView.bounds.origin.y : 0.0
	);

	if (moyureaderOverlayCurrentChapterIndex != chapterIndex) {
		moyureaderOverlayCurrentChapterIndex = chapterIndex;
		MoyuReaderRefreshOverlayControls();
		MoyuReaderApplyOverlayChapterButtonStyles();
		if (moyureaderOverlayChapterPanelVisible) {
			dispatch_async(dispatch_get_main_queue(), ^{
				MoyuReaderScrollCurrentChapterButtonIntoView();
			});
		}
	}

	MoyuReaderEnqueueOverlayAction(@"position", chapterIndex, chapterProgress, YES);
}

static void MoyuReaderSetOverlayChromeVisible(BOOL visible) {
	if (moyureaderOverlayCamouflageCollapsed) {
		moyureaderOverlayChromeVisible = NO;
		moyureaderOverlayControlsVisible = NO;
		moyureaderOverlayFooterVisible = NO;

		if (moyureaderOverlayHeaderView != nil) {
			[moyureaderOverlayHeaderView setHidden:YES];
			[moyureaderOverlayHeaderView setNeedsDisplay:YES];
		}
		if (moyureaderOverlayControlsView != nil) {
			[moyureaderOverlayControlsView setHidden:YES];
		}
		if (moyureaderOverlayFooterView != nil) {
			[moyureaderOverlayFooterView setHidden:YES];
		}
		if (moyureaderOverlayChapterPanelView != nil) {
			[moyureaderOverlayChapterPanelView setHidden:YES];
		}
		if (moyureaderOverlayResizeHandleView != nil) {
			[moyureaderOverlayResizeHandleView setHidden:YES];
			[moyureaderOverlayResizeHandleView setNeedsDisplay:YES];
		}
		if (moyureaderOverlayRootView != nil) {
			[moyureaderOverlayRootView setNeedsDisplay:YES];
		}
		return;
	}

	moyureaderOverlayChromeVisible = visible;
	moyureaderOverlayControlsVisible = visible;
	moyureaderOverlayFooterVisible = visible;

	if (moyureaderOverlayHeaderView != nil) {
		[moyureaderOverlayHeaderView setHidden:!visible];
		[moyureaderOverlayHeaderView setNeedsDisplay:YES];
	}
	if (moyureaderOverlayControlsView != nil) {
		[moyureaderOverlayControlsView setHidden:!visible];
	}
	if (moyureaderOverlayFooterView != nil) {
		[moyureaderOverlayFooterView setHidden:!visible];
	}
	if (moyureaderOverlayChapterPanelView != nil) {
		[moyureaderOverlayChapterPanelView setHidden:!(visible && moyureaderOverlayChapterPanelVisible)];
	}
	if (moyureaderOverlayResizeHandleView != nil) {
		[moyureaderOverlayResizeHandleView setHidden:!visible];
		[moyureaderOverlayResizeHandleView setNeedsDisplay:YES];
	}
	if (moyureaderOverlayRootView != nil) {
		[moyureaderOverlayRootView setNeedsDisplay:YES];
	}
}

static void MoyuReaderSetOverlayControlsVisible(BOOL visible) {
	MoyuReaderSetOverlayChromeVisible(visible);
}

static void MoyuReaderSetOverlayFooterVisible(BOOL visible) {
	MoyuReaderSetOverlayChromeVisible(visible);
}

static BOOL MoyuReaderShouldRevealOverlayUIAtPoint(NSPoint point, NSRect bounds) {
	if (NSIsEmptyRect(bounds) || !NSPointInRect(point, bounds)) {
		return NO;
	}

	if (moyureaderOverlayChapterPanelVisible && moyureaderOverlayChapterPanelView != nil &&
	    NSPointInRect(point, moyureaderOverlayChapterPanelView.frame)) {
		return YES;
	}

	NSRect innerBounds = NSMakeRect(
		MoyuReaderOverlayChromeRevealDistance,
		MoyuReaderOverlayBottomRevealHeight,
		MAX(0.0, NSWidth(bounds) - (MoyuReaderOverlayChromeRevealDistance * 2.0)),
		MAX(0.0, NSHeight(bounds) - MoyuReaderOverlayTopRevealHeight - MoyuReaderOverlayBottomRevealHeight)
	);
	if (NSWidth(innerBounds) <= 0.0 || NSHeight(innerBounds) <= 0.0) {
		return YES;
	}

	return !NSPointInRect(point, innerBounds);
}

static void MoyuReaderUpdateOverlayHoverStateAtPoint(NSPoint point) {
	if (moyureaderOverlayRootView == nil) {
		return;
	}

	NSRect bounds = moyureaderOverlayRootView.bounds;
	MoyuReaderSetOverlayChromeVisible(MoyuReaderShouldRevealOverlayUIAtPoint(point, bounds));
}

static void MoyuReaderUpdateOverlayHoverStateForCurrentMouseLocation(NSWindow *window) {
	if (window == nil || moyureaderOverlayRootView == nil) {
		MoyuReaderSetOverlayChromeVisible(NO);
		return;
	}

	NSPoint point = [moyureaderOverlayRootView convertPoint:[window mouseLocationOutsideOfEventStream] fromView:nil];
	MoyuReaderUpdateOverlayHoverStateAtPoint(point);
}

static void MoyuReaderHandleOverlayMouseTracking(NSView *view, NSEvent *event) {
	if (view == nil || event == nil || moyureaderOverlayRootView == nil) {
		return;
	}

	MoyuReaderMarkOverlayPointerReentered();
	NSPoint point = [moyureaderOverlayRootView convertPoint:event.locationInWindow fromView:nil];
	MoyuReaderUpdateOverlayHoverStateAtPoint(point);
}

static BOOL MoyuReaderOverlayPointInView(NSPoint point, NSView *view) {
	if (moyureaderOverlayRootView == nil || view == nil || view.superview == nil || view.hidden) {
		return NO;
	}

	NSRect frameInRoot = [moyureaderOverlayRootView convertRect:view.bounds fromView:view];
	return NSPointInRect(point, frameInRoot);
}

static void MoyuReaderHandleOverlayMouseDownEvent(NSEvent *event) {
	if (event == nil || event.window != moyureaderOverlayWindow || !moyureaderOverlayChapterPanelVisible ||
	    moyureaderOverlayRootView == nil) {
		return;
	}

	NSPoint point = [moyureaderOverlayRootView convertPoint:event.locationInWindow fromView:nil];
	if (MoyuReaderOverlayPointInView(point, moyureaderOverlayChapterPanelView) ||
	    MoyuReaderOverlayPointInView(point, moyureaderOverlayDirectoryButton)) {
		return;
	}

	MoyuReaderDismissOverlayChapterPanel();
}

static void MoyuReaderPerformOverlayWindowDrag(NSWindow *window, NSEvent *event) {
	if (window == nil || event == nil || event.type != NSEventTypeLeftMouseDown) {
		return;
	}

	MoyuReaderSetOverlayChromeVisible(YES);
	[window performWindowDragWithEvent:event];
}

// 透明浮窗仍保留一层轻量拖拽框，方便用户在极低可见度下找到并调整大小。
static void MoyuReaderLayoutDesktopReaderOverlayViews(void) {
	if (moyureaderOverlayRootView == nil || moyureaderOverlayScrollView == nil || moyureaderOverlayHeaderView == nil ||
	    moyureaderOverlayResizeHandleView == nil || moyureaderOverlayControlsView == nil ||
	    moyureaderOverlayFooterView == nil) {
		return;
	}

	NSClipView *contentView = moyureaderOverlayScrollView.contentView;
	NSPoint preservedScrollOrigin = NSZeroPoint;
	BOOL shouldPreserveScroll =
		moyureaderOverlayVisible &&
		contentView != nil &&
		[moyureaderOverlayScrollView documentView] != nil &&
		!moyureaderOverlayCamouflageCollapsed;
	if (shouldPreserveScroll) {
		preservedScrollOrigin = contentView.bounds.origin;
	}

	NSRect bounds = moyureaderOverlayRootView.bounds;
	if (moyureaderOverlayCamouflageCollapsed) {
		[moyureaderOverlayHeaderView setHidden:YES];
		[moyureaderOverlayControlsView setHidden:YES];
		[moyureaderOverlayFooterView setHidden:YES];
		[moyureaderOverlayResizeHandleView setHidden:YES];
		[moyureaderOverlayScrollView setHidden:YES];
		if (moyureaderOverlayChapterPanelView != nil) {
			[moyureaderOverlayChapterPanelView setHidden:YES];
		}
		[moyureaderOverlayRootView setNeedsDisplay:YES];
		return;
	}

	[moyureaderOverlayScrollView setHidden:NO];
	[moyureaderOverlayHeaderView setFrame:NSMakeRect(
		12.0,
		NSHeight(bounds) - MoyuReaderOverlayHeaderHeight - MoyuReaderOverlayHeaderTopInset,
		MAX(80.0, NSWidth(bounds) - 24.0),
		MoyuReaderOverlayHeaderHeight
	)];
	CGFloat controlsY = NSHeight(bounds) - MoyuReaderOverlayHeaderHeight - MoyuReaderOverlayHeaderTopInset - MoyuReaderOverlayControlsHeight - 6.0;
	[moyureaderOverlayControlsView setFrame:NSMakeRect(
		12.0,
		controlsY,
		MAX(160.0, NSWidth(bounds) - 24.0),
		MoyuReaderOverlayControlsHeight
	)];
	[moyureaderOverlayFooterView setFrame:NSMakeRect(
		12.0,
		12.0,
		MAX(160.0, NSWidth(bounds) - 24.0),
		MoyuReaderOverlayFooterHeight
	)];
	[moyureaderOverlayResizeHandleView setFrame:NSMakeRect(
		NSWidth(bounds) - MoyuReaderOverlayResizeHandleHitSize - 2.0,
		0.0,
		MoyuReaderOverlayResizeHandleHitSize,
		MoyuReaderOverlayResizeHandleHitSize
	)];

	CGFloat controlsWidth = NSWidth(moyureaderOverlayControlsView.bounds);
	CGFloat buttonWidth = 48.0;
	CGFloat closeWidth = 48.0;
	CGFloat opacityLabelWidth = 44.0;
	CGFloat opacitySliderWidth = 220.0;
	CGFloat fixedWidth = (buttonWidth * 4.0) + closeWidth + opacityLabelWidth + opacitySliderWidth + (MoyuReaderOverlayControlsGap * 6.0) + 20.0;
	if (fixedWidth > controlsWidth) {
		opacitySliderWidth = MAX(120.0, controlsWidth - ((buttonWidth * 4.0) + closeWidth + opacityLabelWidth + (MoyuReaderOverlayControlsGap * 6.0) + 20.0));
	}
	CGFloat currentX = 10.0;
	CGFloat currentY = 6.0;
	CGFloat controlHeight = MoyuReaderOverlayControlsHeight - 12.0;

	[moyureaderOverlayPrevButton setFrame:NSMakeRect(currentX, currentY, buttonWidth, controlHeight)];
	currentX += buttonWidth + MoyuReaderOverlayControlsGap;
	[moyureaderOverlayNextButton setFrame:NSMakeRect(currentX, currentY, buttonWidth, controlHeight)];
	currentX += buttonWidth + MoyuReaderOverlayControlsGap;
	[moyureaderOverlayDirectoryButton setFrame:NSMakeRect(currentX, currentY, buttonWidth, controlHeight)];
	currentX += buttonWidth + MoyuReaderOverlayControlsGap;
	[moyureaderOverlayCamouflageButton setFrame:NSMakeRect(currentX, currentY, buttonWidth, controlHeight)];
	currentX += buttonWidth + MoyuReaderOverlayControlsGap;
	[moyureaderOverlayCloseButton setFrame:NSMakeRect(currentX, currentY, closeWidth, controlHeight)];
	currentX += closeWidth + MoyuReaderOverlayControlsGap;

	[moyureaderOverlayOpacityLabel setFrame:NSMakeRect(currentX, currentY + 8.0, opacityLabelWidth, 16.0)];
	currentX += opacityLabelWidth + MoyuReaderOverlayControlsGap;
	[moyureaderOverlayOpacitySlider setFrame:NSMakeRect(currentX, currentY + 2.0, opacitySliderWidth, controlHeight)];

	CGFloat footerWidth = NSWidth(moyureaderOverlayFooterView.bounds);
	CGFloat footerHeight = NSHeight(moyureaderOverlayFooterView.bounds);
	CGFloat progressLabelWidth = 108.0;
	[moyureaderOverlayProgressLabel setFrame:NSMakeRect(10.0, floor((footerHeight - 16.0) / 2.0), progressLabelWidth, 16.0)];
	[moyureaderOverlayProgressSlider setFrame:NSMakeRect(
		progressLabelWidth + 16.0,
		floor((footerHeight - 20.0) / 2.0),
		MAX(80.0, footerWidth - progressLabelWidth - 28.0),
		20.0
	)];
	MoyuReaderRefreshOverlayProgressBar();

	NSRect scrollFrame = NSInsetRect(bounds, MoyuReaderOverlayContentInset, MoyuReaderOverlayContentInset);
	scrollFrame.origin.y += MoyuReaderOverlayFooterHeight + 14.0;
	scrollFrame.size.height -= (MoyuReaderOverlayHeaderHeight +
		MoyuReaderOverlayHeaderTopInset +
		MoyuReaderOverlayControlsHeight +
		MoyuReaderOverlayFooterHeight +
		24.0);
	[moyureaderOverlayScrollView setFrame:scrollFrame];

	if (moyureaderOverlayIsResizing) {
		if (moyureaderOverlayChapterPanelView != nil) {
			[moyureaderOverlayChapterPanelView setHidden:YES];
		}
		[moyureaderOverlayRootView setNeedsDisplay:YES];
		return;
	}

	MoyuReaderOverlayTextView *textView = (MoyuReaderOverlayTextView *)[moyureaderOverlayScrollView documentView];
	if (textView != nil) {
		MoyuReaderResizeOverlayTextViewToFitContent(textView, scrollFrame.size);
		CGFloat attachmentWidth = MAX(120.0, scrollFrame.size.width - (textView.textContainerInset.width * 2.0) - 8.0);
		CGFloat resizeThreshold = moyureaderOverlayIsResizing ? 18.0 : 1.0;
		if (moyureaderOverlayLastAttachmentResizeWidth <= 0.0 ||
		    fabs(moyureaderOverlayLastAttachmentResizeWidth - attachmentWidth) >= resizeThreshold) {
			MoyuReaderResizeOverlayTextAttachments(textView.textStorage, attachmentWidth);
			moyureaderOverlayLastAttachmentResizeWidth = attachmentWidth;
			MoyuReaderResizeOverlayTextViewToFitContent(textView, scrollFrame.size);
		}
	}

	if (shouldPreserveScroll && contentView != nil && textView != nil) {
		CGFloat maxOffsetY = MAX(0.0, NSHeight(textView.frame) - NSHeight(contentView.bounds));
		NSPoint clampedScrollOrigin = NSMakePoint(
			0.0,
			MIN(MAX(preservedScrollOrigin.y, 0.0), maxOffsetY)
		);
		[contentView scrollToPoint:clampedScrollOrigin];
		[moyureaderOverlayScrollView reflectScrolledClipView:contentView];
		MoyuReaderOverlayDebugLog(
			@"layout preserve scroll from=%.1f to=%.1f viewportH=%.1f contentH=%.1f",
			preservedScrollOrigin.y,
			clampedScrollOrigin.y,
			NSHeight(contentView.bounds),
			NSHeight(textView.frame)
		);
	}

	if (moyureaderOverlayChapterPanelView != nil && moyureaderOverlayChapterListScrollView != nil && moyureaderOverlayChapterListContentView != nil) {
		CGFloat chapterPanelWidth = MIN(MoyuReaderOverlayChapterPanelWidth, MAX(180.0, NSWidth(bounds) - 24.0));
		CGFloat chapterPanelHeight = MIN(320.0, MAX(120.0, scrollFrame.size.height - 12.0));
		[moyureaderOverlayChapterPanelView setFrame:NSMakeRect(
			12.0,
			MAX(scrollFrame.origin.y + scrollFrame.size.height - chapterPanelHeight, scrollFrame.origin.y),
			chapterPanelWidth,
			chapterPanelHeight
		)];
		[moyureaderOverlayChapterListScrollView setFrame:NSInsetRect(moyureaderOverlayChapterPanelView.bounds, 8.0, 8.0)];

		CGFloat contentWidth = NSWidth(moyureaderOverlayChapterListScrollView.bounds);
		CGFloat currentButtonY = 8.0;
		for (NSButton *button in moyureaderOverlayChapterButtons) {
			[button setFrame:NSMakeRect(
				8.0,
				currentButtonY,
				MAX(60.0, contentWidth - 16.0),
				MoyuReaderOverlayChapterRowHeight
			)];
			currentButtonY += MoyuReaderOverlayChapterRowHeight + MoyuReaderOverlayChapterRowGap;
		}
		[moyureaderOverlayChapterListContentView setFrame:NSMakeRect(
			0,
			0,
			contentWidth,
			MAX(NSHeight(moyureaderOverlayChapterListScrollView.bounds), currentButtonY)
		)];
		[moyureaderOverlayRootView addSubview:moyureaderOverlayChapterPanelView positioned:NSWindowAbove relativeTo:moyureaderOverlayScrollView];
	}

	MoyuReaderApplyOverlayChapterButtonStyles();
	[moyureaderOverlayRootView setNeedsDisplay:YES];
}

static void MoyuReaderEnsureDesktopReaderOverlayWindow(void) {
	if (moyureaderOverlayWindow != nil) {
		return;
	}

	NSRect frame = MoyuReaderPreferredDesktopReaderOverlayFrame();
	NSUInteger styleMask = NSWindowStyleMaskBorderless |
		NSWindowStyleMaskResizable |
		NSWindowStyleMaskNonactivatingPanel;

	moyureaderOverlayWindow = [[MoyuReaderOverlayPanel alloc] initWithContentRect:frame
	                                                  styleMask:styleMask
	                                                    backing:NSBackingStoreBuffered
	                                                      defer:NO];
	[moyureaderOverlayWindow setReleasedWhenClosed:NO];
	[moyureaderOverlayWindow setOpaque:NO];
	[moyureaderOverlayWindow setBackgroundColor:[NSColor clearColor]];
	[moyureaderOverlayWindow setHasShadow:NO];
	[moyureaderOverlayWindow setMovableByWindowBackground:YES];
	[moyureaderOverlayWindow setFloatingPanel:YES];
	[moyureaderOverlayWindow setIgnoresMouseEvents:NO];
	[moyureaderOverlayWindow setLevel:NSFloatingWindowLevel];
	[moyureaderOverlayWindow setHidesOnDeactivate:NO];
	[moyureaderOverlayWindow setAcceptsMouseMovedEvents:YES];
	[moyureaderOverlayWindow setCollectionBehavior:
	  NSWindowCollectionBehaviorCanJoinAllSpaces |
	  NSWindowCollectionBehaviorFullScreenAuxiliary];
	[moyureaderOverlayWindow setTitleVisibility:NSWindowTitleHidden];
	[moyureaderOverlayWindow setTitlebarAppearsTransparent:YES];
	[moyureaderOverlayWindow setMinSize:NSMakeSize(MoyuReaderOverlayMinWidth, MoyuReaderOverlayMinHeight)];
	[moyureaderOverlayWindow setAnimationBehavior:NSWindowAnimationBehaviorNone];
	if (moyureaderOverlayMouseDownMonitor == nil) {
		moyureaderOverlayMouseDownMonitor = [NSEvent addLocalMonitorForEventsMatchingMask:
			(NSEventMaskLeftMouseDown | NSEventMaskRightMouseDown | NSEventMaskOtherMouseDown)
			handler:^NSEvent *(NSEvent *event) {
				MoyuReaderHandleOverlayMouseDownEvent(event);
				return event;
			}];
	}

	moyureaderOverlayRootView = [[MoyuReaderOverlayRootView alloc] initWithFrame:NSMakeRect(0, 0, frame.size.width, frame.size.height)];
	[moyureaderOverlayRootView setWantsLayer:YES];
	moyureaderOverlayRootView.layer.backgroundColor = [NSColor clearColor].CGColor;
	[moyureaderOverlayWindow setContentView:moyureaderOverlayRootView];

	moyureaderOverlayHeaderView = [[MoyuReaderOverlayHeaderView alloc] initWithFrame:NSZeroRect];
	[moyureaderOverlayHeaderView setAutoresizingMask:NSViewWidthSizable | NSViewMinYMargin];
	[moyureaderOverlayRootView addSubview:moyureaderOverlayHeaderView];

	if (moyureaderOverlayControlTarget == nil) {
		moyureaderOverlayControlTarget = [[MoyuReaderOverlayControlTarget alloc] init];
	}

	moyureaderOverlayControlsView = [[NSView alloc] initWithFrame:NSZeroRect];
	[moyureaderOverlayControlsView setWantsLayer:YES];
	moyureaderOverlayControlsView.layer.cornerRadius = 14.0;
	moyureaderOverlayControlsView.layer.borderWidth = 1.0;
	moyureaderOverlayControlsView.layer.borderColor = [[NSColor whiteColor] colorWithAlphaComponent:0.16].CGColor;
	moyureaderOverlayControlsView.layer.backgroundColor = [[NSColor blackColor] colorWithAlphaComponent:0.18].CGColor;
	[moyureaderOverlayControlsView setHidden:YES];
	[moyureaderOverlayRootView addSubview:moyureaderOverlayControlsView];

	moyureaderOverlayFooterView = [[NSView alloc] initWithFrame:NSZeroRect];
	[moyureaderOverlayFooterView setWantsLayer:YES];
	moyureaderOverlayFooterView.layer.cornerRadius = 12.0;
	moyureaderOverlayFooterView.layer.borderWidth = 1.0;
	moyureaderOverlayFooterView.layer.borderColor = [[NSColor whiteColor] colorWithAlphaComponent:0.12].CGColor;
	moyureaderOverlayFooterView.layer.backgroundColor = [[NSColor blackColor] colorWithAlphaComponent:0.24].CGColor;
	[moyureaderOverlayFooterView setHidden:YES];
	[moyureaderOverlayRootView addSubview:moyureaderOverlayFooterView];

	moyureaderOverlayPrevButton = MoyuReaderCreateOverlayActionButton(@"上章", @selector(handlePrevChapter:));
	moyureaderOverlayNextButton = MoyuReaderCreateOverlayActionButton(@"下章", @selector(handleNextChapter:));
	moyureaderOverlayDirectoryButton = MoyuReaderCreateOverlayActionButton(@"目录", @selector(handleToggleDirectory:));
	moyureaderOverlayCamouflageButton = MoyuReaderCreateOverlayActionButton(@"收纳", @selector(handleToggleCamouflage:));
	moyureaderOverlayCloseButton = MoyuReaderCreateOverlayActionButton(@"退出", @selector(handleCloseOverlay:));
	moyureaderOverlayProgressLabel = MoyuReaderCreateOverlayLabel(@"章节进度 0%");
	moyureaderOverlayOpacityLabel = MoyuReaderCreateOverlayLabel(@"透明度");
	moyureaderOverlayProgressSlider = [[NSSlider alloc] initWithFrame:NSZeroRect];
	[moyureaderOverlayProgressSlider setMinValue:0.0];
	[moyureaderOverlayProgressSlider setMaxValue:100.0];
	[moyureaderOverlayProgressSlider setContinuous:YES];
	[moyureaderOverlayProgressSlider setTarget:moyureaderOverlayControlTarget];
	[moyureaderOverlayProgressSlider setAction:@selector(handleProgressChanged:)];

	moyureaderOverlayOpacitySlider = [[NSSlider alloc] initWithFrame:NSZeroRect];
	[moyureaderOverlayOpacitySlider setMinValue:0.02];
	[moyureaderOverlayOpacitySlider setMaxValue:1.0];
	[moyureaderOverlayOpacitySlider setContinuous:YES];
	[moyureaderOverlayOpacitySlider setTarget:moyureaderOverlayControlTarget];
	[moyureaderOverlayOpacitySlider setAction:@selector(handleOpacityChanged:)];

	[moyureaderOverlayControlsView addSubview:moyureaderOverlayPrevButton];
	[moyureaderOverlayControlsView addSubview:moyureaderOverlayNextButton];
	[moyureaderOverlayControlsView addSubview:moyureaderOverlayDirectoryButton];
	[moyureaderOverlayControlsView addSubview:moyureaderOverlayCamouflageButton];
	[moyureaderOverlayControlsView addSubview:moyureaderOverlayCloseButton];
	[moyureaderOverlayControlsView addSubview:moyureaderOverlayOpacityLabel];
	[moyureaderOverlayControlsView addSubview:moyureaderOverlayOpacitySlider];
	[moyureaderOverlayFooterView addSubview:moyureaderOverlayProgressLabel];
	[moyureaderOverlayFooterView addSubview:moyureaderOverlayProgressSlider];

	moyureaderOverlayChapterPanelView = [[MoyuReaderOverlayChapterPanelView alloc] initWithFrame:NSZeroRect];
	[moyureaderOverlayChapterPanelView setWantsLayer:YES];
	moyureaderOverlayChapterPanelView.layer.cornerRadius = 16.0;
	moyureaderOverlayChapterPanelView.layer.borderWidth = 1.0;
	moyureaderOverlayChapterPanelView.layer.borderColor = [[NSColor whiteColor] colorWithAlphaComponent:0.18].CGColor;
	moyureaderOverlayChapterPanelView.layer.backgroundColor = [NSColor colorWithCalibratedWhite:0.09 alpha:0.98].CGColor;
	[moyureaderOverlayChapterPanelView setHidden:YES];
	[moyureaderOverlayRootView addSubview:moyureaderOverlayChapterPanelView];

	moyureaderOverlayChapterListScrollView = [[MoyuReaderOverlayChapterListScrollView alloc] initWithFrame:NSZeroRect];
	[moyureaderOverlayChapterListScrollView setDrawsBackground:NO];
	[moyureaderOverlayChapterListScrollView setBorderType:NSNoBorder];
	[moyureaderOverlayChapterListScrollView setHasVerticalScroller:YES];
	[moyureaderOverlayChapterListScrollView setHasHorizontalScroller:NO];
	[moyureaderOverlayChapterListScrollView setScrollerStyle:NSScrollerStyleOverlay];
	[moyureaderOverlayChapterPanelView addSubview:moyureaderOverlayChapterListScrollView];

	moyureaderOverlayChapterListContentView = [[MoyuReaderOverlayFlippedView alloc] initWithFrame:NSZeroRect];
	[moyureaderOverlayChapterListContentView setWantsLayer:YES];
	moyureaderOverlayChapterListContentView.layer.backgroundColor = [NSColor clearColor].CGColor;
	[moyureaderOverlayChapterListScrollView setDocumentView:moyureaderOverlayChapterListContentView];

	moyureaderOverlayScrollView = [[MoyuReaderOverlayScrollView alloc] initWithFrame:NSZeroRect];
	[moyureaderOverlayScrollView setDrawsBackground:NO];
	[moyureaderOverlayScrollView setBorderType:NSNoBorder];
	[moyureaderOverlayScrollView setHasVerticalScroller:NO];
	[moyureaderOverlayScrollView setHasHorizontalScroller:NO];
	[moyureaderOverlayScrollView setScrollerStyle:NSScrollerStyleOverlay];
	[moyureaderOverlayScrollView setWantsLayer:YES];

	MoyuReaderOverlayTextView *textView = [[MoyuReaderOverlayTextView alloc] initWithFrame:NSZeroRect];
	[textView setAutoresizingMask:NSViewWidthSizable | NSViewHeightSizable];
	[textView setEditable:NO];
	[textView setSelectable:NO];
	[textView setRichText:YES];
	[textView setImportsGraphics:YES];
	[textView setDrawsBackground:NO];
	[textView setHorizontallyResizable:NO];
	[textView setVerticallyResizable:YES];
	[textView setMinSize:NSMakeSize(frame.size.width, frame.size.height)];
	[textView setMaxSize:NSMakeSize(frame.size.width, CGFLOAT_MAX)];
	[textView setTextContainerInset:NSMakeSize(22, 18)];
	[textView setWantsLayer:YES];
	[textView.textContainer setWidthTracksTextView:YES];
	[textView.textContainer setContainerSize:NSMakeSize(frame.size.width, CGFLOAT_MAX)];

	[moyureaderOverlayScrollView setDocumentView:textView];
	[moyureaderOverlayRootView addSubview:moyureaderOverlayScrollView];

	moyureaderOverlayResizeHandleView = [[MoyuReaderOverlayResizeHandleView alloc] initWithFrame:NSZeroRect];
	[moyureaderOverlayResizeHandleView setAutoresizingMask:NSViewMinXMargin | NSViewMaxYMargin];
	[moyureaderOverlayRootView addSubview:moyureaderOverlayResizeHandleView];

	moyureaderOverlayChapterTitles = @[];
	moyureaderOverlayChapterButtons = [[NSMutableArray alloc] init];
	moyureaderOverlayActionQueue = [[NSMutableArray alloc] init];
	moyureaderOverlayControlsVisible = NO;
	moyureaderOverlayFooterVisible = NO;
	moyureaderOverlayExpandedFrame = frame;
	MoyuReaderRefreshOverlayControls();
	MoyuReaderSetOverlayChromeVisible(NO);
	MoyuReaderLayoutDesktopReaderOverlayViews();
}

static NSArray<NSString *> *MoyuReaderParseOverlayChapterTitles(const char *chaptersJSON) {
	if (chaptersJSON == NULL) {
		return @[];
	}

	NSString *jsonString = [NSString stringWithUTF8String:chaptersJSON];
	if (jsonString == nil || jsonString.length == 0) {
		return @[];
	}

	NSData *data = [jsonString dataUsingEncoding:NSUTF8StringEncoding];
	if (data == nil) {
		return @[];
	}

	id parsed = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
	if (![parsed isKindOfClass:[NSArray class]]) {
		return @[];
	}

	NSMutableArray<NSString *> *titles = [NSMutableArray array];
	for (id item in (NSArray *)parsed) {
		if ([item isKindOfClass:[NSString class]]) {
			[titles addObject:item];
			continue;
		}

		if (item != nil) {
			[titles addObject:[item description]];
		}
	}

	return [titles copy];
}

static void MoyuReaderUpdateDesktopReaderOverlayControls(const char *chaptersJSON, int currentChapter, double progress, double opacity, BOOL camouflageEnabled) {
	char *chaptersJSONCopy = chaptersJSON != NULL ? strdup(chaptersJSON) : NULL;
	dispatch_async(dispatch_get_main_queue(), ^{
		MoyuReaderEnsureDesktopReaderOverlayWindow();

		NSArray<NSString *> *nextTitles = MoyuReaderParseOverlayChapterTitles(chaptersJSONCopy);
		BOOL shouldKeepExistingTitles = nextTitles.count == 0 && moyureaderOverlayChapterTitles.count > 0;
		if (!shouldKeepExistingTitles && ![moyureaderOverlayChapterTitles isEqualToArray:nextTitles]) {
			moyureaderOverlayChapterTitles = nextTitles;
			MoyuReaderRefreshOverlayChapterButtons();
		}

		moyureaderOverlayCurrentChapterIndex = currentChapter;
		moyureaderOverlayCurrentProgress = progress;
		moyureaderOverlayCurrentOpacity = opacity;
		MoyuReaderSetOverlayCamouflageEnabled(camouflageEnabled);
		MoyuReaderRefreshOverlayControls();
		MoyuReaderLayoutDesktopReaderOverlayViews();
		MoyuReaderOverlayDebugLog(
			@"controls currentChapter=%d progress=%.3f opacity=%.3f camouflage=%d",
			currentChapter,
			progress,
			opacity,
			camouflageEnabled
		);

		if (chaptersJSONCopy != NULL) {
			free(chaptersJSONCopy);
		}
	});
}

static char *MoyuReaderConsumeDesktopReaderOverlayActions(void) {
	__block char *jsonCString = NULL;

	MoyuReaderPerformSyncOnMainQueue(^{
		if (moyureaderOverlayActionQueue == nil || moyureaderOverlayActionQueue.count == 0) {
			return;
		}

		NSData *jsonData = [NSJSONSerialization dataWithJSONObject:moyureaderOverlayActionQueue options:0 error:nil];
		[moyureaderOverlayActionQueue removeAllObjects];
		if (jsonData == nil || jsonData.length == 0) {
			return;
		}

		NSString *jsonString = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
		if (jsonString == nil || jsonString.length == 0) {
			return;
		}

		jsonCString = strdup(jsonString.UTF8String);
	});

	return jsonCString;
}

static char *MoyuReaderGetDesktopReaderOverlayReadingLocation(void) {
	__block char *jsonCString = NULL;

	MoyuReaderPerformSyncOnMainQueue(^{
		if (!moyureaderOverlayVisible) {
			return;
		}

		NSDictionary *readingLocation = MoyuReaderResolveOverlayReadingLocation();
		if (readingLocation == nil) {
			return;
		}

		NSData *jsonData = [NSJSONSerialization dataWithJSONObject:readingLocation options:0 error:nil];
		if (jsonData == nil || jsonData.length == 0) {
			return;
		}

		NSString *jsonString = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
		if (jsonString == nil || jsonString.length == 0) {
			return;
		}

		jsonCString = strdup(jsonString.UTF8String);
	});

	return jsonCString;
}

static void MoyuReaderMoveDesktopReaderOverlayToReadingLocation(int chapterIndex, double progress) {
	dispatch_async(dispatch_get_main_queue(), ^{
		if (!moyureaderOverlayVisible) {
			return;
		}

		MoyuReaderScrollOverlayToReadingLocation((NSInteger)chapterIndex, progress);
	});
}

static void MoyuReaderApplyDesktopReaderOverlayOpacity(double opacity) {
	MoyuReaderEnsureDesktopReaderOverlayWindow();
	moyureaderOverlayCurrentOpacity = MAX(0.02, MIN(opacity, 1.0));

	MoyuReaderOverlayTextView *textView = (MoyuReaderOverlayTextView *)[moyureaderOverlayScrollView documentView];
	if (textView == nil) {
		return;
	}

	if (moyureaderOverlayOpacitySlider != nil) {
		double sliderValue = MoyuReaderOverlayOpacitySliderValue(moyureaderOverlayCurrentOpacity);
		if (fabs(moyureaderOverlayOpacitySlider.doubleValue - sliderValue) >= 0.001) {
			[moyureaderOverlayOpacitySlider setDoubleValue:sliderValue];
		}
	}

	MoyuReaderApplyOverlayContentAlpha(moyureaderOverlayCurrentOpacity);
}

static void MoyuReaderApplyDesktopReaderOverlayContent(const char *text, int fontSize, double lineHeight, double opacity, int red, int green, int blue) {
	MoyuReaderEnsureDesktopReaderOverlayWindow();

	NSString *string = text != NULL ? [NSString stringWithUTF8String:text] : nil;
	if (string == nil) {
		string = @"";
	}
	BOOL contentUnchanged = [moyureaderOverlayCurrentText isEqualToString:string];
	BOOL styleUnchanged =
		moyureaderOverlayCurrentFontSize == fontSize &&
		fabs(moyureaderOverlayCurrentLineHeight - lineHeight) < 0.001 &&
		fabs(moyureaderOverlayCurrentOpacity - opacity) < 0.001 &&
		moyureaderOverlayCurrentRed == red &&
		moyureaderOverlayCurrentGreen == green &&
		moyureaderOverlayCurrentBlue == blue;
	NSArray<NSDictionary *> *previousFragments =
		(moyureaderOverlayVisible && moyureaderOverlayCurrentText.length > 0)
			? MoyuReaderExtractOverlayChapterHTMLFragments(moyureaderOverlayCurrentText)
			: @[];
	NSArray<NSDictionary *> *nextFragments =
		(moyureaderOverlayVisible && string.length > 0)
			? MoyuReaderExtractOverlayChapterHTMLFragments(string)
			: @[];
	BOOL didAppendOnlyContent =
		MoyuReaderOverlayChapterFragmentsSharePrefix(previousFragments, nextFragments) &&
		nextFragments.count > previousFragments.count;
	BOOL canAppendIncrementally =
		didAppendOnlyContent &&
		styleUnchanged &&
		moyureaderOverlayVisible;
	BOOL shouldPreserveScroll =
		moyureaderOverlayVisible &&
		(contentUnchanged || didAppendOnlyContent);
	NSPoint preservedScrollOrigin = NSZeroPoint;
	if (shouldPreserveScroll && moyureaderOverlayScrollView != nil) {
		preservedScrollOrigin = moyureaderOverlayScrollView.contentView.bounds.origin;
	}

	MoyuReaderOverlayTextView *textView = (MoyuReaderOverlayTextView *)[moyureaderOverlayScrollView documentView];
	moyureaderOverlayCurrentText = string ?: @"";
	moyureaderOverlayCurrentFontSize = fontSize;
	moyureaderOverlayCurrentLineHeight = lineHeight;
	moyureaderOverlayCurrentOpacity = opacity;
	moyureaderOverlayCurrentRed = red;
	moyureaderOverlayCurrentGreen = green;
	moyureaderOverlayCurrentBlue = blue;
	moyureaderOverlayLastPositionActionTimestamp = 0.0;
	moyureaderOverlayLastPositionActionChapterIndex = -1;
	moyureaderOverlayLastPositionActionProgress = -1.0;

	MoyuReaderOverlayDebugLog(
		@"apply content unchanged=%d appendOnly=%d incremental=%d styleUnchanged=%d prevChapters=%ld nextChapters=%ld preserve=%d scrollY=%.1f",
		contentUnchanged,
		didAppendOnlyContent,
		canAppendIncrementally,
		styleUnchanged,
		(long)previousFragments.count,
		(long)nextFragments.count,
		shouldPreserveScroll,
		preservedScrollOrigin.y
	);

	if (canAppendIncrementally && textView != nil) {
		BOOL didAppend = MoyuReaderAppendOverlayChaptersToTextView(
			textView,
			nextFragments,
			previousFragments.count,
			fontSize,
			lineHeight,
			opacity,
			red,
			green,
			blue
		);
		if (didAppend) {
			CGFloat attachmentWidth = MAX(120.0, NSWidth(moyureaderOverlayScrollView.contentView.bounds) - (textView.textContainerInset.width * 2.0) - 8.0);
			MoyuReaderResizeOverlayTextAttachments([textView textStorage], attachmentWidth);
			moyureaderOverlayLastAttachmentResizeWidth = attachmentWidth;
			MoyuReaderResizeOverlayTextViewToFitContent(textView, moyureaderOverlayScrollView.contentView.bounds.size);
			MoyuReaderApplyOverlayContentAlpha(opacity);
			if (shouldPreserveScroll && moyureaderOverlayScrollView != nil) {
				[moyureaderOverlayScrollView.contentView scrollToPoint:preservedScrollOrigin];
				[moyureaderOverlayScrollView reflectScrolledClipView:moyureaderOverlayScrollView.contentView];
			}
			MoyuReaderOverlayDebugLog(
				@"append chapters delta=%ld textLength=%ld scrollY=%.1f",
				(long)(nextFragments.count - previousFragments.count),
				(long)textView.textStorage.length,
				moyureaderOverlayScrollView.contentView.bounds.origin.y
			);
			MoyuReaderRefreshOverlayControls();
			MoyuReaderNotifyOverlayReadingLocationIfNeeded();
			return;
		}

		MoyuReaderOverlayDebugLog(@"append fallback to full rebuild");
	}

	NSArray<NSNumber *> *chapterIndices = nil;
	NSArray<NSValue *> *chapterRanges = nil;
	NSMutableAttributedString *attributedText = MoyuReaderCreateOverlayAttributedString(
		string,
		&chapterIndices,
		&chapterRanges
	);
	moyureaderOverlayContentChapterIndices = chapterIndices ?: @[];
	moyureaderOverlayContentChapterRanges = chapterRanges ?: @[];
	if (attributedText == nil) {
		attributedText = [[NSMutableAttributedString alloc] initWithString:string ?: @""];
	}
	MoyuReaderApplyOverlayTextAttributes(attributedText, fontSize, lineHeight, opacity, red, green, blue);
	[[textView textStorage] setAttributedString:attributedText];
	CGFloat attachmentWidth = MAX(120.0, NSWidth(moyureaderOverlayScrollView.contentView.bounds) - (textView.textContainerInset.width * 2.0) - 8.0);
	moyureaderOverlayLastAttachmentResizeWidth = 0.0;
	MoyuReaderResizeOverlayTextAttachments([textView textStorage], attachmentWidth);
	moyureaderOverlayLastAttachmentResizeWidth = attachmentWidth;
	MoyuReaderResizeOverlayTextViewToFitContent(textView, moyureaderOverlayScrollView.contentView.bounds.size);
	MoyuReaderApplyOverlayContentAlpha(opacity);
	if (shouldPreserveScroll && moyureaderOverlayScrollView != nil) {
		[moyureaderOverlayScrollView.contentView scrollToPoint:preservedScrollOrigin];
		[moyureaderOverlayScrollView reflectScrolledClipView:moyureaderOverlayScrollView.contentView];
	} else {
		[textView scrollRangeToVisible:NSMakeRange(0, 0)];
	}
	MoyuReaderOverlayDebugLog(
		@"full rebuild textLength=%ld scrollY=%.1f",
		(long)textView.textStorage.length,
		moyureaderOverlayScrollView.contentView.bounds.origin.y
	);
	MoyuReaderRefreshOverlayControls();
	MoyuReaderNotifyOverlayReadingLocationIfNeeded();
}

static void MoyuReaderShowDesktopReaderOverlayWindow(const char *text, int fontSize, double lineHeight, double opacity, int red, int green, int blue) {
	char *textCopy = text != NULL ? strdup(text) : NULL;
	dispatch_async(dispatch_get_main_queue(), ^{
		moyureaderMainAppWindow = MoyuReaderResolveMainAppWindow();
		[moyureaderOverlayActionQueue removeAllObjects];
		moyureaderOverlayLastOpacityActionTimestamp = 0.0;
		moyureaderOverlayLastOpacityActionValue = -1.0;
		moyureaderOverlayLastPositionActionTimestamp = 0.0;
		moyureaderOverlayLastPositionActionChapterIndex = -1;
		moyureaderOverlayLastPositionActionProgress = -1.0;
		moyureaderOverlayIsResizing = NO;
		moyureaderOverlaySuppressCamouflageCollapseUntilReenter = NO;
		MoyuReaderSetOverlayChapterPanelVisible(NO);
		MoyuReaderApplyDesktopReaderOverlayContent(textCopy, fontSize, lineHeight, opacity, red, green, blue);

		NSRect nextFrame = moyureaderOverlayCamouflageCollapsed
			? MoyuReaderOverlayExpandedFrameForRestore()
			: MoyuReaderPreferredDesktopReaderOverlayFrame();
		moyureaderOverlayCamouflageCollapsed = NO;
		[moyureaderOverlayWindow setMinSize:NSMakeSize(MoyuReaderOverlayMinWidth, MoyuReaderOverlayMinHeight)];
		[moyureaderOverlayScrollView setHidden:NO];
		[moyureaderOverlayWindow setFrame:nextFrame display:YES animate:NO];
		MoyuReaderLayoutDesktopReaderOverlayViews();

		if (moyureaderMainAppWindow != nil) {
			[moyureaderMainAppWindow orderOut:nil];
		}

		moyureaderOverlayVisible = YES;
		MoyuReaderSetOverlayChromeVisible(NO);
		MoyuReaderSetOverlayControlsVisible(NO);
		MoyuReaderSetOverlayFooterVisible(NO);
		[moyureaderOverlayWindow makeKeyAndOrderFront:nil];
		[moyureaderOverlayWindow makeFirstResponder:[moyureaderOverlayScrollView documentView]];
		[NSApp activateIgnoringOtherApps:YES];

		if (textCopy != NULL) {
			free(textCopy);
		}
	});
}

static void MoyuReaderUpdateDesktopReaderOverlayWindow(const char *text, int fontSize, double lineHeight, double opacity, int red, int green, int blue) {
	char *textCopy = text != NULL ? strdup(text) : NULL;
	dispatch_async(dispatch_get_main_queue(), ^{
		if (!moyureaderOverlayVisible) {
			if (textCopy != NULL) {
				free(textCopy);
			}
			return;
		}

		MoyuReaderApplyDesktopReaderOverlayContent(textCopy, fontSize, lineHeight, opacity, red, green, blue);
		if (textCopy != NULL) {
			free(textCopy);
		}
	});
}

static void MoyuReaderUpdateDesktopReaderOverlayOpacity(double opacity) {
	dispatch_async(dispatch_get_main_queue(), ^{
		if (!moyureaderOverlayVisible) {
			return;
		}

		MoyuReaderApplyDesktopReaderOverlayOpacity(opacity);
	});
}

static void MoyuReaderHideDesktopReaderOverlayWindow(void) {
	dispatch_async(dispatch_get_main_queue(), ^{
		moyureaderOverlayIsResizing = NO;
		moyureaderOverlayLastOpacityActionTimestamp = 0.0;
		moyureaderOverlayLastOpacityActionValue = -1.0;
		moyureaderOverlayLastPositionActionTimestamp = 0.0;
		moyureaderOverlayLastPositionActionChapterIndex = -1;
		moyureaderOverlayLastPositionActionProgress = -1.0;
		moyureaderOverlaySuppressCamouflageCollapseUntilReenter = NO;
		moyureaderOverlayContentChapterIndices = @[];
		moyureaderOverlayContentChapterRanges = @[];
		if (moyureaderOverlayCamouflageCollapsed && moyureaderOverlayWindow != nil) {
			NSRect expandedFrame = MoyuReaderOverlayExpandedFrameForRestore();
			moyureaderOverlayExpandedFrame = expandedFrame;
			moyureaderOverlayCamouflageCollapsed = NO;
			[moyureaderOverlayWindow setMinSize:NSMakeSize(MoyuReaderOverlayMinWidth, MoyuReaderOverlayMinHeight)];
			[moyureaderOverlayScrollView setHidden:NO];
			[moyureaderOverlayWindow setFrame:expandedFrame display:NO animate:NO];
		}

		if (moyureaderOverlayWindow != nil) {
			[moyureaderOverlayWindow orderOut:nil];
		}

		moyureaderOverlayVisible = NO;
		MoyuReaderSetOverlayChapterPanelVisible(NO);
		MoyuReaderSetOverlayChromeVisible(NO);
		MoyuReaderSetOverlayControlsVisible(NO);
		MoyuReaderSetOverlayFooterVisible(NO);

		if (moyureaderMainAppWindow != nil) {
			[moyureaderMainAppWindow makeKeyAndOrderFront:nil];
			[NSApp activateIgnoringOtherApps:YES];
		}
	});
}

static BOOL MoyuReaderIsDesktopReaderOverlayVisible(void) {
	return moyureaderOverlayVisible;
}
*/
import "C"

import "unsafe"

func desktopReaderOverlaySupported() bool {
	return true
}

func showDesktopReaderOverlay(text string, fontSize int, lineHeight, opacity float64, red, green, blue int) {
	cText := C.CString(text)
	defer C.free(unsafe.Pointer(cText))

	C.MoyuReaderShowDesktopReaderOverlayWindow(
		cText,
		C.int(fontSize),
		C.double(lineHeight),
		C.double(opacity),
		C.int(red),
		C.int(green),
		C.int(blue),
	)
}

func updateDesktopReaderOverlay(text string, fontSize int, lineHeight, opacity float64, red, green, blue int) {
	cText := C.CString(text)
	defer C.free(unsafe.Pointer(cText))

	C.MoyuReaderUpdateDesktopReaderOverlayWindow(
		cText,
		C.int(fontSize),
		C.double(lineHeight),
		C.double(opacity),
		C.int(red),
		C.int(green),
		C.int(blue),
	)
}

func updateDesktopReaderOverlayOpacity(opacity float64) {
	C.MoyuReaderUpdateDesktopReaderOverlayOpacity(C.double(opacity))
}

func updateDesktopReaderOverlayControls(
	chaptersJSON string,
	currentChapter int,
	progress, opacity float64,
	camouflageEnabled bool,
) {
	cChaptersJSON := C.CString(chaptersJSON)
	defer C.free(unsafe.Pointer(cChaptersJSON))

	C.MoyuReaderUpdateDesktopReaderOverlayControls(
		cChaptersJSON,
		C.int(currentChapter),
		C.double(progress),
		C.double(opacity),
		C._Bool(camouflageEnabled),
	)
}

func hideDesktopReaderOverlay() {
	C.MoyuReaderHideDesktopReaderOverlayWindow()
}

func isDesktopReaderOverlayVisible() bool {
	return bool(C.MoyuReaderIsDesktopReaderOverlayVisible())
}

func consumeDesktopReaderOverlayActions() string {
	cActions := C.MoyuReaderConsumeDesktopReaderOverlayActions()
	if cActions == nil {
		return ""
	}
	defer C.free(unsafe.Pointer(cActions))

	return C.GoString(cActions)
}

func getDesktopReaderOverlayReadingLocation() string {
	cLocation := C.MoyuReaderGetDesktopReaderOverlayReadingLocation()
	if cLocation == nil {
		return ""
	}
	defer C.free(unsafe.Pointer(cLocation))

	return C.GoString(cLocation)
}

func moveDesktopReaderOverlayToReadingLocation(chapterIndex int, progress float64) {
	C.MoyuReaderMoveDesktopReaderOverlayToReadingLocation(
		C.int(chapterIndex),
		C.double(progress),
	)
}
