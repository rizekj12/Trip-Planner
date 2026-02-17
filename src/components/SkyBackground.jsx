import React from 'react';

export default function SkyBackground() {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden">
            <style>{`
        /* Sky gradient */
        .sky {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            #0f2b5b 0%,
            #1a4a8a 25%,
            #2e6dbf 50%,
            #5b9bd5 70%,
            #a8c8e8 85%,
            #ddeeff 100%
          );
        }

        /* Stars */
        .stars {
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(1px 1px at 10% 15%, white 0%, transparent 100%),
            radial-gradient(1px 1px at 25% 8%, white 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 40% 20%, white 0%, transparent 100%),
            radial-gradient(1px 1px at 55% 5%, white 0%, transparent 100%),
            radial-gradient(1px 1px at 70% 12%, white 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 85% 18%, white 0%, transparent 100%),
            radial-gradient(1px 1px at 15% 30%, rgba(255,255,255,0.7) 0%, transparent 100%),
            radial-gradient(1px 1px at 60% 25%, rgba(255,255,255,0.5) 0%, transparent 100%),
            radial-gradient(1px 1px at 90% 8%, rgba(255,255,255,0.8) 0%, transparent 100%);
          opacity: 0.6;
        }

        /* Clouds */
        .cloud {
          position: absolute;
          background: white;
          border-radius: 50px;
          opacity: 0.9;
        }

        .cloud::before,
        .cloud::after {
          content: '';
          position: absolute;
          background: white;
          border-radius: 50%;
        }

        /* Cloud layer 1 - large slow clouds */
        .cloud-1 {
          width: 280px;
          height: 60px;
          top: 35%;
          animation: float-cloud-1 80s linear infinite;
        }
        .cloud-1::before {
          width: 120px;
          height: 80px;
          top: -40px;
          left: 40px;
        }
        .cloud-1::after {
          width: 90px;
          height: 60px;
          top: -30px;
          left: 130px;
        }

        .cloud-2 {
          width: 200px;
          height: 50px;
          top: 55%;
          animation: float-cloud-2 60s linear infinite;
          opacity: 0.7;
        }
        .cloud-2::before {
          width: 90px;
          height: 70px;
          top: -35px;
          left: 30px;
        }
        .cloud-2::after {
          width: 70px;
          height: 50px;
          top: -25px;
          left: 100px;
        }

        .cloud-3 {
          width: 350px;
          height: 70px;
          top: 45%;
          animation: float-cloud-3 100s linear infinite;
          opacity: 0.85;
        }
        .cloud-3::before {
          width: 140px;
          height: 90px;
          top: -50px;
          left: 60px;
        }
        .cloud-3::after {
          width: 100px;
          height: 65px;
          top: -35px;
          left: 180px;
        }

        .cloud-4 {
          width: 180px;
          height: 45px;
          top: 25%;
          animation: float-cloud-4 70s linear infinite;
          opacity: 0.6;
        }
        .cloud-4::before {
          width: 80px;
          height: 60px;
          top: -30px;
          left: 25px;
        }
        .cloud-4::after {
          width: 60px;
          height: 45px;
          top: -22px;
          left: 90px;
        }

        .cloud-5 {
          width: 240px;
          height: 55px;
          top: 65%;
          animation: float-cloud-5 90s linear infinite;
          opacity: 0.75;
        }
        .cloud-5::before {
          width: 100px;
          height: 75px;
          top: -38px;
          left: 45px;
        }
        .cloud-5::after {
          width: 80px;
          height: 55px;
          top: -28px;
          left: 130px;
        }

        /* Airplane */
        .airplane-wrapper {
          position: absolute;
          top: 22%;
          animation: fly-plane 45s linear infinite;
        }

        .airplane {
          font-size: 2.5rem;
          filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
          transform: scaleX(1);
        }

        .contrail {
          position: absolute;
          top: 50%;
          right: 100%;
          width: 120px;
          height: 3px;
          background: linear-gradient(to left, rgba(255,255,255,0.8), transparent);
          transform: translateY(-50%);
          border-radius: 2px;
        }

        /* Second airplane going opposite direction */
        .airplane-wrapper-2 {
          position: absolute;
          top: 72%;
          animation: fly-plane-2 65s linear infinite;
        }

        .airplane-2 {
          font-size: 1.8rem;
          filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.2));
          transform: scaleX(-1);
          opacity: 0.8;
        }

        .contrail-2 {
          position: absolute;
          top: 50%;
          left: 100%;
          width: 100px;
          height: 2px;
          background: linear-gradient(to right, rgba(255,255,255,0.7), transparent);
          transform: translateY(-50%);
          border-radius: 2px;
        }

        /* Cloud animations - start at different positions */
        @keyframes float-cloud-1 {
          from { transform: translateX(-400px); }
          to { transform: translateX(110vw); }
        }
        @keyframes float-cloud-2 {
          from { transform: translateX(110vw); }
          to { transform: translateX(-400px); }
        }
        @keyframes float-cloud-3 {
          from { transform: translateX(-500px); }
          to { transform: translateX(110vw); }
        }
        @keyframes float-cloud-4 {
          from { transform: translateX(110vw); }
          to { transform: translateX(-300px); }
        }
        @keyframes float-cloud-5 {
          from { transform: translateX(-300px); }
          to { transform: translateX(110vw); }
        }

        /* Airplane animations */
        @keyframes fly-plane {
          from { transform: translateX(-150px); }
          to { transform: translateX(110vw); }
        }
        @keyframes fly-plane-2 {
          from { transform: translateX(110vw); }
          to { transform: translateX(-150px); }
        }

        /* Sun */
        .sun {
          position: absolute;
          width: 80px;
          height: 80px;
          background: radial-gradient(circle, #fff9c4 0%, #ffeb3b 40%, #ff9800 80%, transparent 100%);
          border-radius: 50%;
          top: 10%;
          right: 15%;
          box-shadow:
            0 0 40px 15px rgba(255, 200, 50, 0.4),
            0 0 80px 30px rgba(255, 150, 0, 0.2);
          animation: pulse-sun 4s ease-in-out infinite;
        }

        @keyframes pulse-sun {
          0%, 100% { box-shadow: 0 0 40px 15px rgba(255, 200, 50, 0.4), 0 0 80px 30px rgba(255, 150, 0, 0.2); }
          50% { box-shadow: 0 0 50px 20px rgba(255, 200, 50, 0.5), 0 0 100px 40px rgba(255, 150, 0, 0.25); }
        }

        /* Overlay for readability */
        .sky-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.15) 0%,
            rgba(0, 0, 0, 0.05) 50%,
            rgba(0, 0, 0, 0.2) 100%
          );
        }
      `}</style>

            {/* Sky */}
            <div className="sky" />

            {/* Stars (visible at top) */}
            <div className="stars" />

            {/* Sun */}
            <div className="sun" />

            {/* Clouds */}
            <div className="cloud cloud-1" style={{ animationDelay: '-20s' }} />
            <div className="cloud cloud-2" style={{ animationDelay: '-10s' }} />
            <div className="cloud cloud-3" style={{ animationDelay: '-45s' }} />
            <div className="cloud cloud-4" style={{ animationDelay: '-5s' }} />
            <div className="cloud cloud-5" style={{ animationDelay: '-35s' }} />

            {/* Airplane 1 - going right */}
            <div className="airplane-wrapper" style={{ animationDelay: '-15s' }}>
                <div className="contrail" />
                <div className="airplane">✈</div>
            </div>

            {/* Airplane 2 - going left */}
            <div className="airplane-wrapper-2" style={{ animationDelay: '-30s' }}>
                <div className="contrail-2" />
                <div className="airplane-2">✈</div>
            </div>

            {/* Readability overlay */}
            <div className="sky-overlay" />
        </div>
    );
}