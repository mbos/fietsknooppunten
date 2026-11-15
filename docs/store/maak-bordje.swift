// Maakt het store-plaatje (500x500 PNG). Gebruik: swiftc -O maak-bordje.swift -o /tmp/bordje && /tmp/bordje knooppunt-500.png 42
import AppKit

// Fietsknooppuntbordje: wit bord met groene rand, "knooppunt", groot nummer en een fiets.
let size = 500.0
let out = CommandLine.arguments[1]
let number = CommandLine.arguments.count > 2 ? CommandLine.arguments[2] : "42"
let green = NSColor(srgbRed: 0.0, green: 0.50, blue: 0.24, alpha: 1)

let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(size), pixelsHigh: Int(size),
                           bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                           colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)

// Groene achtergrond (zoals een paal/omgeving), wit bord met groene rand
green.setFill()
NSBezierPath(roundedRect: NSRect(x: 0, y: 0, width: size, height: size), xRadius: 90, yRadius: 90).fill()
let board = NSRect(x: 40, y: 40, width: size - 80, height: size - 80)
NSColor.white.setFill()
NSBezierPath(roundedRect: board, xRadius: 50, yRadius: 50).fill()
green.setStroke()
let border = NSBezierPath(roundedRect: board.insetBy(dx: 18, dy: 18), xRadius: 34, yRadius: 34)
border.lineWidth = 14
border.stroke()

func draw(_ text: String, font: NSFont, centerY: Double) {
    let attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: green]
    let s = NSAttributedString(string: text, attributes: attrs)
    let b = s.size()
    s.draw(at: NSPoint(x: (size - b.width) / 2, y: centerY - b.height / 2))
}

draw("knooppunt", font: .systemFont(ofSize: 44, weight: .semibold), centerY: 382)
draw(number, font: .systemFont(ofSize: 190, weight: .heavy), centerY: 262)

if let bike = NSImage(systemSymbolName: "bicycle", accessibilityDescription: nil)?
    .withSymbolConfiguration(.init(pointSize: 64, weight: .bold)) {
    let tinted = NSImage(size: bike.size, flipped: false) { rect in
        bike.draw(in: rect)
        green.set()
        rect.fill(using: .sourceAtop)
        return true
    }
    let w = bike.size.width, h = bike.size.height
    tinted.draw(in: NSRect(x: (size - w) / 2, y: 88, width: w, height: h))
}

NSGraphicsContext.restoreGraphicsState()
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: out))
