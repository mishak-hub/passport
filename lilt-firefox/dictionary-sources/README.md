# Dictionary source snapshots and rebuilding

Original TEI files, license headers and release metadata are included. JMdict_e.gz and cedict.gz are upstream snapshots downloaded September 26, 2026. Data ownership and licenses remain with their authors; see ../sources.html and ../data/.

To rebuild this exact snapshot, from this directory run:

    python build_packs.py . ../data

To refresh for a new extension release, run:

    python get_packs.py
    python build_packs.py dictionaries ../data

The downloader verifies FreeDict SHA-512 checksums from its release catalog. Review upstream license/format changes and tests; copy refreshed source snapshots and attribution documents into the source bundle, update version/date/coverage counts, and redistribute matching sources with the derivative packs. Keep JMdict up to date for future releases. Do not auto-download these large datasets into every user's browsing session.
