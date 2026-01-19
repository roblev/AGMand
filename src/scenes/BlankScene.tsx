interface BlankSceneProps {
    sceneNumber: number;
}

function BlankScene({ sceneNumber }: BlankSceneProps) {
    return (
        <>
            {/* Blank canvas area */}
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                <div className="blank-scene">
                    <div className="blank-scene-content">
                        <span className="scene-number">{sceneNumber}</span>
                        <p>This scene is not yet implemented</p>
                    </div>
                </div>
            </div>

            {/* Scene UI Overlay - AGCube style */}
            <div className="overlay-container">
                <div className="glass-card title-card">
                    <h1>Scene {sceneNumber}</h1>
                    <p>Coming soon...</p>
                </div>

                <div className="glass-card">
                    <div className="control-group">
                        <div className="slider-label">
                            <span>Status</span>
                            <span className="slider-value">Not implemented</span>
                        </div>
                    </div>
                    <p style={{ fontSize: '13px', opacity: 0.6, margin: 0 }}>
                        Press keys 1-9 to switch scenes
                    </p>
                </div>
            </div>
        </>
    );
}

export default BlankScene;
