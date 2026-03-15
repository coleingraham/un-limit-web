Un:Limit
========

# Overview

Un:Limit is a multi-touch virtual musical instrument controller intended to be
used on tablets. The primary goal is to provide an intuitive way to perform
music in just intonation by providing visual aids for playing ratios from a
given fundamental.

This web implementation uses typescript, react, vite, MUI for all standard UI
components. All source files should follow the following structure:

- src/
-- components/   # components reusable across multiple pages
-- hooks/        # code for interacting with any external APIs
-- pages/        # all individual pages
--- components/  # page-specific components

Individual pages/components should be their own source files.

# Design

This section describes the overall structure of the application.

## Audio Engine

This uses [microsynth](https://github.com/coleingraham/microsynth) for audio.
The instrument and effects synthdefs can be loaded and/or edited in the app.

## Instrument View

The primary view for the app and what loads initially. This is divided into two
main sections: the top control panel and the main playing area.

### Control Panel

The control panel provides high level global controls for the instrument. There
are two sliders: master volume (top), and master timbre (bottom). Both sliders
should responde relative to touches (sliding a touch from a given point moves
the slider by that much, rather than snapping to the touch position). The master
volume applies to the gain of the master bus. Master timbre is a free parameter
that can be assigned to the synths or effect as needed. By Default this should
be a per note lowpass filter cutoff relative to the fundamental pitch ranging
from 0.0 (one octave above the fundamental) to 1.0 (4 octaves above the
fundamental).

## Playing Area

The playing area takes up the majority of the page. It consists of a number of
"virtual strings" going from left (lowest note) to right (highest note.). The
strings are arranged from lowest root (bottom string) to highest root (top
string), where each higher string is a specified ratio above the previous. The
default will be 4:3, similar to a bass.

### Virtual Strings

A "virtual string" is a horizontal strip of the screen. The x axis represents
pitch from low (left) to high (right). The y axis is used to control volume
where the center of the strip is full volume and the edges (top and bottom) are
silent. There should be a slight buffer region near the top and bottom of the
strip to prevent accidentally changing strings.

Each string shows indicators,thin vertical lines, placed at the 12 tone equal
tempered notes lay, colored white or black like piano keys as a visual
reference.

### Tuning Guides

Each touch should have an indicator (e.g. a gradient circle) providing visual
feedback about the current volume of the corresponding note. Additionally,
various "tuning guides" should be displayed. A "tuning guide" is a straight line
whose slope is determined by a given tuning ratio. Where the "tuning guide"
intersects with the other "virtual strings" shows where the associated ratio is
on that string. For example, if the strings are tuned with 4:3 between them, the
"tuning guide" for 4:3 would be a vertical line. The "tuning guides" should be
somewhat transparant as to not obscure the rest of the instrument, and extend
the full height of the playing area (extrapolating beyond the top and bottom
strings). When two touches are in tune with a
given ratio, the "tuning guide" should provide visual feedback (e.g. glowing).
There can be any number of "tuning guides" representing any number of (unique)
ratios. The default should be 3:2, 4:3, 5:4, 7:4.

## Settings View

This is where the user specifies things like the ratio between strings, which
"tuning guide" ratios to display, and any other general settings.

## SynthDef Editor View

Here the user should be able to load microsynth DSL files for the instrument
and master effects. This should be a text editor with a button that plays pulses
of the synth going through the effect so that the user can hear what they are
doing. the microsynth files should be able to be saved and loaded as cookies.
