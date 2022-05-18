# PDF Render engine and service
This project provides a PDF layout and rendering engine, along with a web service 
to render the PDF on-demand.

### Why this?
Creating a PDF is hard.  You can use many great editors, but ONLY for fixed content.  If you have dynamic context,
like a changing product list of variable length, or different titles and names, there's no great solution.  The
goal of this service is to create something that is:

* Data Driven for both content and structure
* Easy to modify on the fly
* Uses common layout standards
* Usable as a service

### Okay, but why not wkhtmltopdf or one of the other render-a-website-as-pdf services?
The killer feature here is being able to have repeatable entry and exit sections on a 
variable sized list.  If you have a table with a header row, for example, and the table flows onto the next page, 
ideally you want: The page header (if any) to be included, possibly with a dynamic page number, then the header
row to be repeated, and then keep going with the content.  None of the existing services actually support that 
full requirement.

Plus, they all tend to be very finicky.  This service may be finicky too, but in a way we can debug and fix it, versus 
relying on how a headless browser on a server somewhere is responding with the latest chromium updates.

### Cool, but, Data Driven? That doesn't sound like fun to work with
Working directly with the data for the structure isn't hugely hard, but large PDFs become difficult.
The _end_ goal for all of this is to create a graphical template editor, which you can only do if your PDF is 
driven by data.   Otherwise, you're always dependent on a developer working on your (graphical) content.

This also separates the data aspect (which can be fed from an API, for example) from the visual structure, which 
can allow division of responsibilities.

https://react-pdf.org/
https://yogalayout.com/
https://craft.js.org/
https://en.wikipedia.org/wiki/PDF

## Features

### Layout

This service is based on react-pdf, which in turn uses the Yoga layout engine.  
This means that layout is largely based on flexbox with a minimal CSS syntax.
The hope is that this means a lot of layout knowledge can transfer from web design
experience.

### Styling

#### Inline Styles

This service supports a subset of CSS properties ( See https://react-pdf.org/styling#valid-css-properties ) 
that can be assigned directly to an element. This includes basic layout and visual styles.

```json
    {
        "type":"text",
        "text":"Hello World",
        "style":{
            "fontSize":18,
            "color":"#000000",
            "margin":5,
            "position":"absolute",
            "top":0,
            "left":0
        }
    }
```

### Classes
Similar to css, you can create named styles that you can apply as classes to individual elements.
Unlike css, the application of properties is dependent on the order of the classname in the list.
This means that classes are applied in list order, with subsequent classes overwriting properties
of earlier ones, and finally any explicit element style is applied.

```json
{
    "styles": {
        "zeroPad": {
            "margin": 0,
            "padding": 0
        },
        "smallPad": {
            "padding": 2
        },
        "guideTitle": {
            "fontSize": 24,
            "fontWeight": "bold",
            "textAlign": "center",
            "color": "#F7A03A"
        }
    },
    ...
    "pages":[
        ...
            {
                "type":"text",
                "classes":["zeroPad", "smallPad", "guideTitle"], // padding set to 2 as smallPad overwrites zeroPad's prop,
                "style":{
                    "color":"#000000" // color is black as this overwrites the guideTitle prop
                }
            }
        ...
    ]
}
```

### Dynamic Data and Templating

You can provide an arbitrary data model as the 'data' property, and your structure is able to access it in 
any property.  In fact, your structure can access the entire data structure!

In order to reference data inline, you can use a `{{variablename}}` syntax.  So for example, if you provided 
a data structure:
```json
{
    "title":"Hello World"
}
```

Then you could reference that anywhere in your structure like so:
```json
{
    "text": "Title: {{data.title}}",
    ...
}
```

You can use it in image src properties:
```json
{
    "src": "https://images.com/{{data.imageUrl}}",
    ...
}
```

Or in styles:
```json
"style":{
    "marginLeft":"{{data.standardMargin}}",
    ...
}
```

In fact, the code between `{` `}` can be any arbitrary javascript!
```json
{
    "text":"{{[1,2,3,4].filter(i => i > 2).map(i => 'Index:' + (i+1))}}"
}
```

> Executing javascript (beyond simple derefences like `data.value`) can be _very_ expensive
and cause the PDF generation to be _very_ slow.

### Logical layouts 

You can use logical elements to affect changes on the structure based on the data.  Currently we have only 
implemented 'list', but 'if' is the next candidate. 

Basically, this means that you can use a list to iterate and apply a specific template over an array of elements in
your data.

For example, if you have:
```json
{
    "data":{
        "items":[
            "One",
            "Two",
            "Three"
        ]
    }
}
```
You can loop over that array with a list, referencing each data element with the locally-scoped '$item' variable:

```json
{
    "type":"list",
    "basis":"data.items",
    "loop":{
        "type":"text",
        "text":"Item {{$item}}"
    }
}
```

### Re-entrant page breaks
You can designate any item 'fixed' to it's place on a page by setting 'fixed':true on it.  This means on each 
page break, this item will be re-rendered to its location.
https://react-pdf.org/advanced#fixed-components

You can also specify that items cannot be subdivided across page breaks by setting 'wrap':false.  This means if
the item won't fit on the page, it will be moved to a new page instead.
https://react-pdf.org/advanced#page-wrapping

A feature specific to our engine are 're-entrant blocks'.  This means that when you create an element, you can 
define a header and footer that are only scoped to that item (as opposed to the page in general).  This means 
that if you have, for example, a grid of contents with a header row, that header can be repeated on any page
break.

```json
{
    "type":"list",
    "basis":"data.items",
    "loop":{
        "type":"text",
        "text":"[{{$item.Name}}] [{{$item.Cost}}]"
    },
    "header":{
        "type":"text",
        "text":"[Item Name] [Cost($)]",
    },
    "footer":{
        "type":"image",
        "src":"https://footers.org/prettypicture.jpg"
    }
}
```

## Usage

### Invoking the service

This isn't designed to be complicated; it supports three operations:

* GET: Return a basic status of readiness.
* OPTIONS: Supports making CORS calls from other domains
* POST: Submit a json payload representing the PDF to be rendered.  The result is a direct PDF 
binary download, or an HTTP error code with details in the body.

### Pages (Container)

Pages are top-level elements, and are the only elements that can exist at the top level.  
They accept basic styling, and have a `children` property for the page's structure.

### Views (Container)

Views are the basic containers that hold content.  Views can contain other containers, or content elements.
They can accept full styling, and have a `children` property for child content.
Typically, you'd either make a container view `'display':'flex'` and designate how it lays out the children,
or `'positioning':'relative'` and then each child lays itself out with `'positioning':'absolute` and the 
`top` `left` `right` and `bottom` properties. 

### Text

Render some basic text on the screen via the `text` property. 

Accepts full styling. 

Cannot contain children.

### Images

Render an image on the screen from the `src` property. This can be a url to an accessible image online,
or a data-url for image content inline (or sourced from the data property via templating).
https://css-tricks.com/data-uris/

Accepts full styling. 

Cannot contain children.

### Lists (Container)

Lists are logical elements, that don't independently affect styling or positioning.  There is no element
added to the rendered document that strictly represents a list.  This means it does NOT have a style 
property.

You must specify a `basis` property and provide the reference to an array of items in your data payload,
although technically you can insert javascript here that simply _results_ in an array.  You must then
provide a `loop` property which defines a single child element that will be rendered for each item in the
basis array.

Optionally, you can provide `header` and `footer`, each of which is a simple element that is placed _before_
or _after_ the list , respectively, _on each page in which the list was rendered_.

Cannot contain children, other than the individual items in `loop` `header` or `footer`.

## Examples