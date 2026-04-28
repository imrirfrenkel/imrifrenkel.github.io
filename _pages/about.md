---
permalink: /
title: "Welcome to my site!"
author_profile: true
redirect_from: 
  - /about/
  - /about.html
---

<script src="/../scripts/gallery_effects.js"></script>

Here you'll find my personal projects, a bit more <a href="#gallery" style="text-decoration: none;">about me</a>, and occasional writings on things of interest 

**stay tuned** for my own personally hosted domain in the near future!
{: .notice}

I am a Principal Materials Scientist / Lead Materials & Processing Engineer, currently developing a new generation of DfAM materials, smart coatings, photo-responsive composite resins, and biomedical devices. Ultimately, I am a 3D-printing enthusiast turned professional, with over 12 years of research and industry projects utilizng AM, building 3D-printers, and developing 3D printable materials.

Previously, I completed my doctoral degree in Materials Science & Engineering at the University of California, Los Angeles with my thesis "Eningeering of Structure-Property Relationships in Smart Responsive Materials for Novel Sensing and Actuation". My research used a holistic approach to device design via examination of structure-property relationships in organic & composite 3D-networks utilizing additive manufacturing, synthetic chemistry, and - to date - over 30 advanced characterization techniques.

Off the clock, if I'm not reading papers, you'll find me brewing experimental espresso, cooking new cuisines, on the rugby pitch (12 years at #13 and counting), or sweating it out in competitive multiplayer tactical games.

<span id="gallery"></span>

|Personal Records ||
|-|-|
| Bench: 220 lb | Leg Press: 675 lb |
| Squat: 335 lb | Deadlift: 425 lb |
| Val: ASC 1  | OW: M3 |

### Gallery
<style>
  thead {
    background-color: #eafcfa;
    /* color-mix(in oklab, #fff 100%, var(--global-footer-bg-color) 15%); */
  }

  th {
    border-right: 0px;
  }

  html[data-theme="dark"] {
    thead {
      background-color: var(--global-thead-color);
    }
  }

  table {
    box-shadow: 2px 2px 1px color-mix(var(--global-footer-bg-color), #fff 50%);
    /*border-right: 2px solid color-mix(var(--global-footer-bg-color), #fff 50%);*/
  }


	.gallery {
    --imgradius: 6px;
    --hovertime: 0.5s ease;
    --fontheight: 14px;
    --lineheight: calc(var(--fontheight) * 2);
    --cols: 3;
    --gap: 4px;
    --shrinkfactor: 1500px;
    --vwidth: 100vw;

		display: flex;
    flex-direction: column;
		flex-wrap: wrap;

    height: calc( var(--shrinkfactor) - ( var(--vwidth) / 925 ) * 4/3);
    width: 100%;
    column-gap: round(calc(var(--gap) / (4/2)));
    row-gap: var(--gap);
    box-sizing: border-box;
		
		justify-content: start;
    align-content: space-evenly;
    align-items: center;

		.panel {
			position: static;
      content-visibility: auto;
      min-width: 0;
      width: calc(100% / var(--cols) - var(--gap) * var(--cols) - 1px);
      height: auto;
      flex: 0 0 auto;
      opacity: 1;
      background-repeat: no-repeat;
      background-size: contain;
      border-radius: var(--imgradius);
      border-bottom: 3px solid grey;
      border-right: 3px solid grey;
      border-top: 1px solid lightgrey;
      border-left: 1px solid lightgrey;
      
      > img {
        opacity: 0;
        min-width: 0;
        width: auto;
        height: auto;
        border-radius: var(--imgradius);
        transition: var(--hovertime);
        z-index: -99;
      }
      .mask {
        background-color: black;
        position: fixed;
        top: 0%;
        left: 0%;
        opacity: 0;
        width: 100%;
        height: calc(var(--imgheight) - var(--lineheight));
        border-radius: var(--imgradius) var(--imgradius) 0 0;
        transition: var(--hovertime);
        z-index: 0;

      }
      .caption {
			transition: var(--hovertime);
      border-radius: 0 0 var(--imgradius) var(--imgradius);
			opacity: 0;
			position: fixed;
			bottom: 0%;
			left: 0%;
      width: 100%;
      z-index: 1;

		}
      .caption_text {
				color: white;
        text-align: center;
				font-size: 0px;
        z-index: 5;
			}
		}
	}

  @media (max-width: 925px) {
    .gallery {
      --cols: round(up, calc( var(--vwidth) / 925 * 3 * 1.15/ 1px));
      aspect-ratio: calc(925 / var(--vwidth)  );

      .panel {
        
      }
    }
  }

	.panel:hover .mask {
		background-color: rgba(0,0,0, 0.4);
    opacity: 1;
	}

  .panel:hover {
    background-color:rgba(0,0,0, 0.0);
    background-blend-mode: multiply;

	}
  
	.panel:hover {
    .caption {
		  opacity: 1;
	  }
    .caption_text {
      opacity: 1;
      background-color: color-mix(#48e1e7 40%, rgba(0,0,0, 0.3) 75%); /* #18b7bd1c */ 
      font-size: var(--fontheight);
      padding: 0.25em 0.5em;
    }
  }



</style>
<div class="gallery"><!--
	<div id="pan1" class="panel" style="background-image: url('/images/Gallery/Food1.jpg');"><img id="im1" src="/images/Gallery/Food1.jpg">
    <div class="mask"></div>
    <div class="caption">
      <div class="caption_text">Caramelized Tomato Tart</div>
    </div>
  </div>
	<div id="pan2" class="panel" style="background-image: url('/images/Gallery/Food2.jpg');"><img id="im2" src="/images/Gallery/Food2.jpg">
    <div class="mask"></div>
    <div class="caption">
      <div class="caption_text">Shio Ramen
      </div></div></div>
	<div class="panel" style="background-image: url('/images/Gallery/Food3.jpg');"><img id="im3" src="/images/Gallery/Food3.jpg">
    <div class="mask"></div>
    <div class="caption">
      <div class="caption_text">Scallops in Squash Velout&eacute;</div>
    </div></div>
	<div class="panel" style="background-image: url('/images/Gallery/Food4.jpg');"><img id="im4" src="/images/Gallery/Food4.jpg">
    <div class="mask"></div>
    <div class="caption">
      <div class="caption_text">Birria Tacos
      </div></div></div>
	<div class="panel" style="background-image: url('/images/Gallery/Food5.jpg');"><img id="im5" src="/images/Gallery/Food5.jpg">
    <div class="mask"></div>
    <div class="caption">
      <div class="caption_text">Tortilla Espa&ntilde;ola
      </div></div></div>
	<div class="panel" style="background-image: url('/images/Gallery/drink1.jpg');"><img id="im6" src="/images/Gallery/drink1.jpg">
    <div class="mask"></div>
    <div class="caption">
      <div class="caption_text">Ivory Carajillo
      </div></div></div>
	<div class="panel" style="background-image: url('/images/Gallery/drink2.jpg');"><img id="im7" src="/images/Gallery/drink2.jpg">
    <div class="mask"></div>
    <div class="caption">
      <div class="caption_text">El Diablo (tequila classic)
      </div></div></div>
	<div class="panel" style="background-image: url('/images/Gallery/outside.jpg');"><img id="im8" src="/images/Gallery/outside.jpg">
    <div class="mask"></div>
    <div class="caption">
      <div class="caption_text">Zen in Balboa Park
      </div></div></div>
	<div class="panel" style="background-image: url('/images/Gallery/outsidebig.jpg');"><img id="im9" src="/images/Gallery/outsidebig.jpg">
    <div class="mask"></div>
    <div class="caption">
      <div class="caption_text">Feeling big at Yosemite
      </div></div></div>
	<div class="panel" style="background-image: url('/images/Gallery/pump.jpg');"><img id="im10" src="/images/Gallery/pump.jpg">
    <div class="mask"></div>
    <div class="caption">
      <div class="caption_text">My Rabbit Pumpkin Spice
      </div></div></div>
  <div class="panel" style="background-image: url('/images/Gallery/pumphd.jpg');"><img id="im10" src="/images/Gallery/pumphd.jpg">
    <div class="mask"></div>
    <div class="caption">
      <div class="caption_text">Candid of Pumpkin Spice
      </div></div></div>
  <div class="panel" style="background-image: url('/images/Gallery/drink3.jpg');"><img id="im11" src="/images/Gallery/drink3.jpg">
    <div class="mask"></div>
    <div class="caption">
      <div class="caption_text">Banana Cow
      </div></div></div> -->
</div>

<script>

</script>
