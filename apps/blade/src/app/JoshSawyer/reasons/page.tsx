import './page.css';

function Reasons() {
	return(
		// Originally I put like 150 lines worth of "PLEASE" on this page but it gave a weird vibe to my eyes to i changed this page to be my cats
		<div className="hello">
			<p className="Reasons">
				imagine i said "PLEASE" here like a thousand times, im a little worried it would be a pain on yalls eyes.
				instead, have some pictures of my cats
			</p>

			<div className="MyCats">
			<img src="../gibi.jpg" className="MyOrangeCat" alt="Orange-cat-looking-goated" />
			<img src="../jasmine.png" className="MyGrayCat" alt="Gray-cat-looking-displeased" />
			</div>
		</div>
	);
};

export default Reasons;
