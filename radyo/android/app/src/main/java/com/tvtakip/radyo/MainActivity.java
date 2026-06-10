package com.tvtakip.radyo;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RadioFavoritesPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
