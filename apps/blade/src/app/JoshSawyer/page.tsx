import pmo from '/images/pmo.png';

function Application() {
    return (
        <div className="Application">
            <header className="Introduction">
                <p>
                    Hello vro...
                </p>
		<img src={pmo} className="Peeling-My-Orange" alt="pmo" />
            </header>
        </div>
    );
}

export default Application;
